"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncOfflineWalletQueue } from "../api/wallet";
import { getOfflineQueue, removeQueueRecords } from "./queue";
import { useToastStore } from "../../store/toast-store";
import { useAppStore } from "../../store/app-store";

export function useOfflineSyncWorker() {
  const token = useAppStore((s) => s.accessToken);
  const role = useAppStore((s) => s.role);
  const pushToast = useToastStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || role !== "STUDENT") return;

    let running = false;
    let timer: number | undefined;

    const syncIfNeeded = async () => {
      if (running || !navigator.onLine) return;
      const records = await getOfflineQueue();
      if (records.length === 0) return;

      running = true;
      try {
        const result = await syncOfflineWalletQueue(records);
        const processedIds = new Set(
          result.results.filter((r) => r.status === "PROCESSED").map((r) => r.localOrderId)
        );
        await removeQueueRecords(records.filter((r) => processedIds.has(r.localOrderId)).map((r) => r.nonce));
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
        void queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
        pushToast("Background sync complete", "success");
      } catch {
        // Silent retry loop; UI still exposes manual Sync in wallet.
      } finally {
        running = false;
      }
    };

    void syncIfNeeded();
    const onOnline = () => {
      void syncIfNeeded();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncIfNeeded();
      }
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    timer = window.setInterval(() => {
      void syncIfNeeded();
    }, 60_000);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer) window.clearInterval(timer);
    };
  }, [pushToast, queryClient, role, token]);
}
