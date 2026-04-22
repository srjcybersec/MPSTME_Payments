"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchOrderById } from "../../../../lib/api/orders";

export default function StudentOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = String(params.id);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "detail", orderId],
    queryFn: () => fetchOrderById(orderId)
  });

  return (
    <section className="space-y-5 p-4">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Order Details</h1>
      {isLoading ? <p className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm text-zinc-300">Loading order...</p> : null}
      {data ? (
        <div className="interactive-card space-y-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-sm text-zinc-300">Order #{data.id.slice(-6)}</p>
          <p className="text-2xl font-bold text-zinc-50">₹{(data.totalAmountPaise / 100).toFixed(2)}</p>
          <div className="interactive-card rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-indigo-300">Current status</p>
            <p className="mt-1 text-sm font-semibold text-indigo-200">{data.status}</p>
          </div>
          {data.status === "READY" && data.receipt?.qrCodeData ? (
            <div className="interactive-card rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">Ready for pickup</p>
              <p className="mb-2 text-xs text-emerald-200">Show this code payload at the counter.</p>
              <pre className="overflow-x-auto rounded-lg border border-emerald-500/20 bg-emerald-950/40 p-2 text-xs text-emerald-200">
                {data.receipt.qrCodeData}
              </pre>
            </div>
          ) : null}
        </div>
      ) : (
        !isLoading && <p className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm text-zinc-400">Order not found.</p>
      )}
    </section>
  );
}
