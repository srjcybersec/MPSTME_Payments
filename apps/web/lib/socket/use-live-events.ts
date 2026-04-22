"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./client";
import { useAppStore } from "../../store/app-store";
import { useToastStore } from "../../store/toast-store";

export function useLiveEvents() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.pushToast);
  const token = useAppStore((s) => s.accessToken);
  const role = useAppStore((s) => s.role);
  const userId = useAppStore((s) => s.userId);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect", () => {
      if (role === "STUDENT" && userId) {
        socket.emit("student:join", { userId });
      }
      if (role === "VENDOR" && userId) {
        socket.emit("vendor:join", { vendorId: userId });
      }
    });

    const onWalletUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      pushToast("Wallet balance updated", "success");
    };
    const onOrderChange = () => {
      void queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["orders", "queue"] });
      pushToast("Order status changed", "info");
    };
    const onStockAlert = () => {
      void queryClient.invalidateQueries({ queryKey: ["menu"] });
      if (role === "VENDOR") {
        pushToast("Low stock alert received", "error");
      }
    };

    socket.on("wallet:balance_updated", onWalletUpdate);
    socket.on("order:status_changed", onOrderChange);
    socket.on("order:new", onOrderChange);
    socket.on("menu:stock_alert", onStockAlert);
    socket.on("order:sync_result", (payload: { localOrderId: string; status: string; failureReason?: string }) => {
      if (payload.status === "PROCESSED") {
        pushToast(`Offline order synced: ${payload.localOrderId.slice(0, 6)}`, "success");
      } else {
        pushToast(
          `Offline sync ${payload.status.toLowerCase()}: ${payload.failureReason ?? "unknown reason"}`,
          "error"
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    });

    return () => {
      socket.off("connect");
      socket.off("wallet:balance_updated", onWalletUpdate);
      socket.off("order:status_changed", onOrderChange);
      socket.off("order:new", onOrderChange);
      socket.off("menu:stock_alert", onStockAlert);
      socket.off("order:sync_result");
    };
  }, [pushToast, queryClient, role, token, userId]);
}
