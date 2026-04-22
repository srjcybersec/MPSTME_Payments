"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createWalletTopupOrder, fetchWallet, syncOfflineWalletQueue } from "../../../lib/api/wallet";
import { ensureRazorpayLoaded } from "../../../lib/payments/razorpay";
import { useAppStore } from "../../../store/app-store";
import { useEffect, useState } from "react";
import { getOfflineQueue, removeQueueRecords } from "../../../lib/offline/queue";
import { useToastStore } from "../../../store/toast-store";
import { getProcessedLocalOrderIds } from "../../../lib/offline/logic";

export default function StudentWalletPage() {
  const userName = useAppStore((s) => s.userName);
  const userEmail = useAppStore((s) => s.userEmail);
  const token = useAppStore((s) => s.accessToken);
  const pushToast = useToastStore((s) => s.pushToast);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [customTopupRupees, setCustomTopupRupees] = useState("100");

  useEffect(() => {
    getOfflineQueue()
      .then((records) => setPendingQueueCount(records.length))
      .catch(() => setPendingQueueCount(0));

    const onOnline = async () => {
      const records = await getOfflineQueue();
      setPendingQueueCount(records.length);
      if (records.length > 0) {
        await syncMutation.mutateAsync(records);
      }
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const topupMutation = useMutation({
    mutationFn: createWalletTopupOrder,
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : "Unable to start top-up right now", "error");
    }
  });
  const syncMutation = useMutation({
    mutationFn: syncOfflineWalletQueue,
    onSuccess: async (result) => {
      const successNonces = getProcessedLocalOrderIds(result.results);
      const records = await getOfflineQueue();
      await removeQueueRecords(records.filter((r) => successNonces.has(r.localOrderId)).map((r) => r.nonce));
      const left = await getOfflineQueue();
      setPendingQueueCount(left.length);
      pushToast("Offline queue sync completed", "success");
    },
    onError: (error) => {
      pushToast(error instanceof Error ? error.message : "Offline queue sync failed", "error");
    }
  });
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: fetchWallet,
    enabled: Boolean(token)
  });

  async function startTopup(amountPaise: number) {
    try {
      if (!token) {
        pushToast("Session expired. Please login again.", "error");
        return;
      }
      const loaded = await ensureRazorpayLoaded();
      if (!loaded) {
        pushToast("Unable to load Razorpay checkout. Please retry.", "error");
        return;
      }

      const order = await topupMutation.mutateAsync(amountPaise);
      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        pushToast("Razorpay SDK did not initialize. Please refresh and try again.", "error");
        return;
      }

      const instance = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.razorpayOrderId,
        name: "MPSTME Smart Canteen",
        description: "Wallet Top-up",
        prefill: {
          name: userName ?? "Student",
          ...(userEmail ? { email: userEmail } : {})
        },
        theme: {
          color: "#5F3BFF"
        },
        handler: () => {
          // Payment verification is server-side via webhook.
        }
      });
      instance.open();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Unable to start top-up right now", "error");
    }
  }

  return (
    <section className="space-y-5 p-4">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Wallet</h1>

      <div className="virtual-card interactive-card rounded-3xl border border-indigo-300/20 p-5 text-white shadow-2xl shadow-indigo-950/60">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-indigo-100/80">CampusBites Wallet</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-indigo-200/70">Available Balance</p>
          </div>
          <div className="virtual-chip h-8 w-11 rounded-md border border-amber-100/50 shadow-md" />
        </div>
        <p className="relative z-10 mt-4 text-4xl font-black tracking-tight">
          {isLoading ? <span className="inline-block h-10 w-32 animate-pulse rounded-lg bg-white/30" /> : `₹${((data?.balancePaise ?? 0) / 100).toFixed(2)}`}
        </p>
        <div className="relative z-10 mt-4 flex items-center justify-between text-xs text-indigo-100/85">
          <span>Fast, secure wallet top-up</span>
          <span className="font-semibold tracking-[0.2em]">**** {String(data?.id ?? "0000").slice(-4)}</span>
        </div>
      </div>

      <div className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">Top up now</p>
          <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">INR 1 to 2000</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[10000, 20000, 50000].map((amount) => (
            <button
              key={amount}
              className="interactive-btn rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-500/20"
              disabled={topupMutation.isPending}
              onClick={() => {
                void startTopup(amount);
              }}
              type="button"
            >
              ₹{amount / 100}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            className="h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-indigo-400/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
            type="number"
            min={1}
            max={2000}
            step="1"
            value={customTopupRupees}
            onChange={(event) => setCustomTopupRupees(event.target.value)}
            placeholder="Enter custom amount (INR)"
          />
          <button
            className="interactive-btn h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-60"
            disabled={topupMutation.isPending}
            onClick={() => {
              const rupees = Number(customTopupRupees);
              if (!Number.isFinite(rupees) || rupees < 1 || rupees > 2000) {
                pushToast("Enter a valid amount between INR 1 and INR 2000.", "error");
                return;
              }
              void startTopup(Math.round(rupees * 100));
            }}
            type="button"
          >
            {topupMutation.isPending ? "Starting..." : "Top up"}
          </button>
        </div>
        {topupMutation.isSuccess ? (
          <p className="mt-2 text-xs text-emerald-300">
            Top-up order created: {topupMutation.data.razorpayOrderId}
          </p>
        ) : null}
        {topupMutation.isError ? (
          <p className="mt-2 text-xs text-rose-300">
            {topupMutation.error instanceof Error ? topupMutation.error.message : "Unable to start top-up right now."}
          </p>
        ) : null}
      </div>

      <div className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">Transaction history</p>
          <p className="text-xs text-zinc-500">Latest 8</p>
        </div>
        <div className="mt-3 space-y-2">
          {data?.transactions?.length ? (
            data.transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="interactive-card flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/70 p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{tx.description}</p>
                  <p className="text-xs text-zinc-500">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <p className={`font-semibold ${tx.type === "CREDIT" ? "text-emerald-300" : "text-rose-300"}`}>
                  {tx.type === "CREDIT" ? "+" : "-"}₹{(tx.amountPaise / 100).toFixed(2)}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-sm text-zinc-500">No wallet transactions yet.</p>
          )}
        </div>
      </div>

      <div className="interactive-card rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold text-amber-200">Offline Queue</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Pending transactions: {pendingQueueCount}
        </p>
        <button
          className="interactive-btn mt-3 rounded-xl bg-amber-300 px-3 py-2 text-xs font-semibold text-amber-950 disabled:opacity-50"
          disabled={syncMutation.isPending || pendingQueueCount === 0}
          onClick={async () => {
            const records = await getOfflineQueue();
            await syncMutation.mutateAsync(records);
          }}
          type="button"
        >
          {syncMutation.isPending ? "Syncing..." : "Sync now"}
        </button>
      </div>
    </section>
  );
}
