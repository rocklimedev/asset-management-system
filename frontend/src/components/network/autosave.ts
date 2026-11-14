export type SaveState = 'saved' | 'pending' | 'saving' | 'retrying' | 'conflict' | 'error';
type Version = { revision: number; snapshot: string };

function sameSnapshot(a: string, b: string): boolean {
  if (a === b) return true;
  // JSON database columns may reorder object keys when returning a committed map.
  const canonical = (_key: string, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value;
  try {
    return JSON.stringify(JSON.parse(a), canonical) === JSON.stringify(JSON.parse(b), canonical);
  } catch {
    return false;
  }
}

/** One writer per editor. Only acknowledged snapshots advance the baseline. */
export class NetworkAutosave {
  private latest: string;
  private baseline: string;
  private revision: number;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private flight: Promise<void> | undefined;
  private stopped = false;
  private blocked = false;
  private rejected: string | undefined;
  private retries = 0;

  constructor(
    initial: Version,
    private write: (snapshot: string, revision: number) => Promise<Version>,
    private read: () => Promise<Version>,
    private notify: (state: SaveState, version?: Version, message?: string) => void,
    private delay = 650,
  ) {
    this.latest = this.baseline = initial.snapshot;
    this.revision = initial.revision;
  }

  update(snapshot: string) {
    this.latest = snapshot;
    if (this.blocked && this.rejected && snapshot !== this.rejected) {
      this.blocked = false;
      this.rejected = undefined;
    }
    if (this.stopped || this.blocked) return;
    clearTimeout(this.timer);
    if (this.flight) return;
    if (this.latest === this.baseline) {
      this.notify('saved');
      return;
    }
    this.notify('pending');
    this.timer = setTimeout(() => void this.flush(), this.delay);
  }

  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.flight) return this.flight;
    if (this.stopped || this.blocked || this.latest === this.baseline) return Promise.resolve();
    const snapshot = this.latest;
    this.notify('saving');
    this.flight = this.commit(snapshot).finally(() => {
      this.flight = undefined;
      if (!this.stopped && !this.blocked && this.latest !== this.baseline) {
        this.timer = setTimeout(() => void this.flush(), this.retries
          ? Math.min(30000, 1000 * 2 ** Math.min(this.retries, 5)) : this.delay);
      }
    });
    return this.flight;
  }

  private async commit(snapshot: string) {
    try {
      const version = await this.write(snapshot, this.revision);
      this.acknowledge(version, snapshot);
    } catch (error) {
      if (this.stopped) return;
      const status = (error as { status?: number }).status;
      // A dropped response may hide a successful commit. Read before retrying.
      try {
        const server = await this.read();
        if (this.stopped) return;
        if (sameSnapshot(server.snapshot, snapshot)) {
          this.acknowledge(server, snapshot);
          return;
        }
        if (server.revision !== this.revision) {
          this.blocked = true;
          this.notify('conflict', undefined, 'Another editor changed the network. Your edits are kept here. Export them before reloading.');
          return;
        }
      } catch { /* Keep the draft and retry transient failures. */ }
      if (this.stopped) return;
      if (status === 409 || (status && status >= 400 && status < 500 && status !== 408 && status !== 429)) {
        const invalid = status === 400 || status === 422;
        this.blocked = !invalid || this.latest === snapshot;
        if (invalid) this.rejected = snapshot;
        if (!this.blocked) {
          this.notify('pending');
          return;
        }
        this.notify(status === 409 ? 'conflict' : 'error', undefined,
          error instanceof Error ? error.message : 'Automatic saving stopped. Export your edits before reloading.');
      } else {
        this.retries++;
        this.notify('retrying', undefined, 'Unable to save. Retrying automatically; your edits remain here.');
      }
    }
  }

  private acknowledge(version: Version, snapshot: string) {
    if (this.stopped) return;
    this.revision = version.revision;
    this.baseline = snapshot;
    this.retries = 0;
    this.notify(this.latest === snapshot ? 'saved' : 'pending', { revision: this.revision, snapshot });
  }

  /** Stop scheduling and wait for any already dispatched write before reloading. */
  async dispose() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.flight;
  }
}
