import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

import { Button } from '../ui/button';

// ============================================================
// PWA PROMPTS
//
// 1. Offline banner    - shown while the browser has no connection.
// 2. Offline ready     - shown once the app shell is cached.
// 3. Update available  - shown when a new version has been deployed.
//    The new version only activates when the user chooses "Update".
// ============================================================

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

export function PwaPrompts() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  const online = useOnlineStatus();

  const closeOfflineReady = () => setOfflineReady(false);
  const closeUpdate = () => setNeedRefresh(false);

  return (
    <>
      {!online && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-warning-muted px-4 py-2 text-sm font-medium text-warning-strong"
        >
          <WifiOff className="h-4 w-4" />
          You're offline. Live data is unavailable until the connection returns.
        </div>
      )}

      {needRefresh && (
        <div
          role="alertdialog"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-overlay"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Update available</p>

            <p className="mt-1 text-sm text-muted-foreground">
              A newer version of ITAM is ready. Update now to get the latest changes.
            </p>

            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => updateServiceWorker(true)}>
                <RefreshCw />
                Update
              </Button>

              <Button size="sm" variant="ghost" onClick={closeUpdate}>
                Later
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={closeUpdate}
            aria-label="Dismiss update notice"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {offlineReady && !needRefresh && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-overlay"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Ready to work offline</p>

            <p className="mt-1 text-sm text-muted-foreground">
              ITAM has been saved to this device. Reports and records still need a connection.
            </p>
          </div>

          <button
            type="button"
            onClick={closeOfflineReady}
            aria-label="Dismiss"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
