"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { refreshAccessToken } from "../../lib/api/auth";
import { useAppStore } from "../../store/app-store";
import { useLiveEvents } from "../../lib/socket/use-live-events";
import { ToastHost } from "./toast-host";
import { useOfflineSyncWorker } from "../../lib/offline/use-offline-sync-worker";
import { PwaRegister } from "./pwa-register";

let lastRefreshAttemptAt = 0;
const REFRESH_THROTTLE_MS = 60_000;

function RuntimeHooks() {
  useLiveEvents();
  useOfflineSyncWorker();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const setAccessToken = useAppStore((s) => s.setAccessToken);
  const accessToken = useAppStore((s) => s.accessToken);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1
          }
        }
      })
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    const now = Date.now();
    if (now - lastRefreshAttemptAt < REFRESH_THROTTLE_MS) {
      return;
    }
    lastRefreshAttemptAt = now;
    refreshAccessToken()
      .then((result) => {
        setAccessToken(result.accessToken);
      })
      .catch(() => {
        // Keep current token and let request-level auth recovery handle expiry.
      });
  }, [accessToken, setAccessToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <PwaRegister />
      <RuntimeHooks />
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
