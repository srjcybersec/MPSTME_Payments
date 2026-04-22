"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { collectOrderByQr, fetchVendorQueue, updateOrderStatus } from "../../../../lib/api/orders";

export default function VendorQueuePage() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<string | null>(null);
  const { data, refetch, isLoading, isError, error } = useQuery({
    queryKey: ["orders", "queue"],
    queryFn: fetchVendorQueue,
    refetchInterval: 10_000
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: "PREPARING" | "READY" | "COLLECTED" | "CANCELLED" }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Order updated successfully.");
      void refetch();
    },
    onError: (mutationError) => {
      setActionSuccess(null);
      setActionError(mutationError instanceof Error ? mutationError.message : "Unable to update order status.");
    }
  });
  const collectMutation = useMutation({
    mutationFn: ({ orderId, qrCodeData }: { orderId: string; qrCodeData: string }) =>
      collectOrderByQr(orderId, qrCodeData),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Order verified and marked as given.");
      void refetch();
    },
    onError: (mutationError) => {
      setActionSuccess(null);
      setActionError(mutationError instanceof Error ? mutationError.message : "Unable to verify QR.");
    }
  });
  const [qrInputs, setQrInputs] = useState<Record<string, string>>({});
  const hasOrders = (data?.length ?? 0) > 0;
  const busy = statusMutation.isPending || collectMutation.isPending;

  function runStatusAction(orderId: string, status: "PREPARING" | "READY" | "COLLECTED" | "CANCELLED") {
    setActionError(null);
    setActionSuccess(null);
    statusMutation.mutate({ orderId, status });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Live Queue</h1>
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">{data?.length ?? 0} orders</span>
        </div>
        <button
          className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          onClick={() => void refetch()}
          type="button"
          disabled={busy || isLoading}
        >
          Refresh
        </button>
      </div>

      {isLoading ? <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">Loading queue...</p> : null}
      {isError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error instanceof Error ? error.message : "Failed to load order queue."}
        </p>
      ) : null}
      {actionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p> : null}
      {actionSuccess ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionSuccess}</p>
      ) : null}
      {!isLoading && !isError && !hasOrders ? (
        <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">No active orders in queue.</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
      {data?.map((order) => (
        <article key={order.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Order ID</p>
              <p className="text-2xl font-bold text-slate-900">#{order.id.slice(-6)}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{order.status}</span>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Amount</span>
              <span className="text-2xl font-bold text-slate-900">₹{(order.totalAmountPaise / 100).toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="h-11 rounded-lg bg-amber-500 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
                disabled={busy || !(order.status === "CONFIRMED" || order.status === "PREPARING")}
                onClick={() => runStatusAction(order.id, "PREPARING")}
                type="button"
              >
                Start
              </button>
              <button
                className="h-11 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                disabled={busy || !(order.status === "CONFIRMED" || order.status === "PREPARING")}
                onClick={() => runStatusAction(order.id, "READY")}
                type="button"
              >
                Ready
              </button>
              <button
                className="h-11 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={busy || order.status !== "READY"}
                onClick={() => runStatusAction(order.id, "COLLECTED")}
                type="button"
              >
                Given
              </button>
              <button
                className="h-11 rounded-lg bg-rose-600 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                disabled={busy}
                onClick={() => setCancelTargetOrderId(order.id)}
                type="button"
              >
                Stop
              </button>
            </div>
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Verify pickup</p>
            <div className="flex gap-2">
              <input
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Paste QR payload"
                value={qrInputs[order.id] ?? ""}
                onChange={(event) =>
                  setQrInputs((current) => ({
                    ...current,
                    [order.id]: event.target.value
                  }))
                }
              />
              <button
                className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                disabled={busy || !(qrInputs[order.id] ?? "").trim()}
                onClick={() =>
                  collectMutation.mutate({
                    orderId: order.id,
                    qrCodeData: qrInputs[order.id] ?? ""
                  })
                }
                type="button"
              >
                Verify
              </button>
            </div>
          </div>
        </article>
      ))}
      </div>

      {cancelTargetOrderId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Confirm stop order</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will cancel the order and trigger refund rules as configured. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                onClick={() => setCancelTargetOrderId(null)}
                type="button"
              >
                Keep Order
              </button>
              <button
                className="h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (!cancelTargetOrderId) return;
                  runStatusAction(cancelTargetOrderId, "CANCELLED");
                  setCancelTargetOrderId(null);
                }}
                type="button"
              >
                Yes, Stop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
