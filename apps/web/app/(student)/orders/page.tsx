 "use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyOrders } from "../../../lib/api/orders";
import { getOfflineQueue } from "../../../lib/offline/queue";

export default function StudentOrdersPage() {
  const [offlineQueued, setOfflineQueued] = useState<
    Array<{ localOrderId: string; amountPaise: number; timestamp: string }>
  >([]);
  const { data } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: fetchMyOrders
  });

  useEffect(() => {
    getOfflineQueue()
      .then((records) =>
        setOfflineQueued(
          records.map((r) => ({
            localOrderId: r.localOrderId,
            amountPaise: r.amountPaise,
            timestamp: r.timestamp
          }))
        )
      )
      .catch(() => setOfflineQueued([]));
  }, [data]);

  return (
    <section className="space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Orders</h1>
        <p className="mt-1 text-sm text-zinc-400">Track queued, active, and completed orders.</p>
      </div>

      {offlineQueued.length > 0 ? (
        <div className="interactive-card rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Queued Offline Orders</p>
          <div className="mt-2 space-y-2">
            {offlineQueued.map((order) => (
              <div key={order.localOrderId} className="interactive-card rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Local #{order.localOrderId.slice(0, 6)}</span>
                  <span className="rounded-full bg-amber-600/30 px-2 py-1 text-[10px] font-semibold tracking-[0.1em]">QUEUED</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-amber-200">
                  <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                  <span>₹{(order.amountPaise / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {data?.length ? (
          data.map((order) => (
            <div key={order.id} className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">Order #{order.id.slice(-6)}</p>
                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-2 py-1 text-[10px] font-semibold tracking-[0.1em] text-indigo-200">
                  {order.status}
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-zinc-50">₹{(order.totalAmountPaise / 100).toFixed(2)}</p>
              <div className="mt-1 text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</div>
              <Link
                className="interactive-btn mt-3 inline-block rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-white/10"
                href={`/orders/${order.id}`}
              >
                View details
              </Link>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-center text-sm text-zinc-400">
            No server orders yet. Once you place an order, it will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
