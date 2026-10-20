import { useEffect, useState } from "react";
import { BACKEND } from "../../lib/api";
import { useAuth } from "../../services/context/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useConfirm } from "../ui/confirm-dialog";

interface Credential {
  id: string;
  title: string;
  category: string;
  purpose: string;
  systemLabel: string;
  username: string;
}
const empty = {
  title: "",
  category: "System login",
  purpose: "",
  systemLabel: "",
  username: "",
  password: "",
};
const categories = [
  "System login",
  "Email",
  "VPN / Network",
  "Business application",
  "Database",
  "Other",
];

export default function EmployeeCredentials({
  employeeId,
}: {
  employeeId: string;
}) {
  const confirm = useConfirm();
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Credential[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [revealed, setRevealed] = useState<{
    id: string;
    password: string;
  } | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function request(
    path = "",
    method = "GET",
    body?: unknown,
    signal?: AbortSignal,
  ) {
    const response = await fetch(
      `${BACKEND}/employees/${employeeId}/credentials${path}`,
      {
        method,
        cache: "no-store",
        signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        response.status === 403
          ? "Your role does not have permission for this credential action."
          : (Array.isArray(data.message)
              ? data.message.join(", ")
              : data.message) || "Credential request failed.",
      );
    }
    return response.json();
  }
  useEffect(() => {
    const controller = new AbortController();
    setItems([]);
    setRevealed(null);
    setForm(empty);
    setShowForm(false);
    setEditing(null);
    setError("");
    setLoading(true);
    request("", "GET", undefined, controller.signal)
      .then(setItems)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [employeeId, accessToken]);
  useEffect(() => {
    if (!revealed) return;
    const timeout = window.setTimeout(() => setRevealed(null), 30000);
    const hide = () => {
      if (document.hidden) setRevealed(null);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [revealed]);
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Encrypted credentials</h3>
          <p className="text-xs text-muted-foreground">
            Employee system and application logins. Passwords hide after 30
            seconds.
          </p>
        </div>
        <Button
          size="sm"
          disabled={loading || busy}
          onClick={() => {
            setForm(empty);
            setEditing(null);
            setShowForm(true);
            setRevealed(null);
          }}
        >
          Add login
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading credentials…</p>
      )}
      {showForm && (
        <form
          className="space-y-3 rounded-lg bg-muted p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const { password, ...rest } = form;
              await request(
                editing ? `/${editing}` : "",
                editing ? "PATCH" : "POST",
                { ...rest, ...(!editing || password ? { password } : {}) },
              );
              setForm(empty);
              setShowForm(false);
              setEditing(null);
              setRevealed(null);
              setItems(await request());
            });
          }}
        >
          <h4 className="text-sm font-medium">
            {editing ? "Edit login" : "New login"}
          </h4>
          {(["title", "systemLabel", "username"] as const).map((field) => (
            <label key={field} className="block text-sm">
              {
                {
                  title: "Login name",
                  systemLabel: "System / application / address",
                  username: "Username",
                }[field]
              }
              <Input
                required
                maxLength={field === "username" ? 1000 : 255}
                autoComplete="off"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </label>
          ))}
          <label className="block text-sm">
            Category
            <Input
              required
              maxLength={100}
              list={`credential-categories-${employeeId}`}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <datalist id={`credential-categories-${employeeId}`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            What is it used for?
            <textarea
              className="w-full rounded-md border bg-background p-2"
              required
              maxLength={4000}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            Password {editing && "(leave blank to keep current)"}
            <Input
              type="password"
              autoComplete="new-password"
              required={!editing}
              maxLength={4000}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save login"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setShowForm(false);
                setForm(empty);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {items.length > 0 && (
        <label className="block text-sm">
          Filter by category
          <select
            className="ml-2 rounded border bg-background p-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {[...new Set(items.map((i) => i.category))].sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No logins saved for this employee.
        </p>
      )}
      {items
        .filter((i) => !filter || i.category === filter)
        .map((item) => (
          <div key={item.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex justify-between gap-2">
              <h4 className="font-medium">{item.title}</h4>
              <span className="text-xs text-muted-foreground">
                {item.category}
              </span>
            </div>
            <p className="break-all text-sm">System: {item.systemLabel}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {item.purpose}
            </p>
            <p className="break-all text-sm">Username: {item.username}</p>
            <p className="break-all font-mono text-sm">
              Password:{" "}
              {revealed?.id === item.id ? revealed.password : "••••••••"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (revealed?.id === item.id) setRevealed(null);
                  else
                    void act(async () => {
                      setRevealed(null);
                      const result = await request(
                        `/${item.id}/reveal`,
                        "POST",
                      );
                      setRevealed({ id: item.id, password: result.password });
                    });
                }}
              >
                {revealed?.id === item.id ? "Hide password" : "Reveal password"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setForm({
                    title: item.title,
                    category: item.category,
                    purpose: item.purpose,
                    systemLabel: item.systemLabel,
                    username: item.username,
                    password: "",
                  });
                  setEditing(item.id);
                  setShowForm(true);
                  setRevealed(null);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  const confirmed = await confirm({
                    title: `Delete “${item.title}”?`,
                    description:
                      "This saved login will be permanently deleted. This cannot be undone.",
                    confirmLabel: "Delete login",
                    tone: "danger",
                  });

                  if (!confirmed) return;

                  void act(async () => {
                    await request(`/${item.id}`, "DELETE");
                    setRevealed(null);
                    setItems(await request());
                  });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
    </section>
  );
}
