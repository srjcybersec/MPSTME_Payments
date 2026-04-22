"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchWallet } from "../../../lib/api/wallet";
import { useAppStore } from "../../../store/app-store";

export default function StudentHomePage() {
  const token = useAppStore((s) => s.accessToken);
  const userName = useAppStore((s) => s.userName);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["wallet", "home-balance"],
    queryFn: fetchWallet,
    enabled: Boolean(token)
  });

  return (
    <section className="space-y-6 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Welcome back</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-50">Hey, {userName ?? "Student"} 👋</h1>
        <p className="mt-1 text-sm text-zinc-400">Hungry for something quick and fresh?</p>
      </div>

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
          {isLoading ? (
            <span className="inline-block h-10 w-36 animate-pulse rounded-lg bg-white/30" />
          ) : (
            `₹${((data?.balancePaise ?? 0) / 100).toFixed(2)}`
          )}
        </p>
        <div className="relative z-10 mt-5 flex gap-2">
          <Link
            className="interactive-btn flex-1 rounded-xl bg-white px-4 py-2 text-center text-sm font-semibold text-indigo-700 shadow-sm"
            href="/wallet"
          >
            Open Wallet
          </Link>
          <Link
            className="interactive-btn flex-1 rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-center text-sm font-semibold text-white"
            href="/menu"
          >
            Explore Menu
          </Link>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          Unable to fetch latest wallet balance right now.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/menu"
          className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4"
        >
          <p className="text-sm font-semibold text-zinc-100">Menu</p>
          <p className="mt-1 text-xs text-zinc-400">Browse specials and add to cart</p>
        </Link>
        <Link
          href="/orders"
          className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4"
        >
          <p className="text-sm font-semibold text-zinc-100">Orders</p>
          <p className="mt-1 text-xs text-zinc-400">Track active and recent orders</p>
        </Link>
      </div>
    </section>
  );
}
