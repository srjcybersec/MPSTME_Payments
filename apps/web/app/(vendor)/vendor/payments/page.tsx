"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVendorWalletTransactions } from "../../../../lib/api/wallet";

const sourceFilters = ["ALL", "RAZORPAY", "WALLET_SYNC", "REFUND", "MANUAL"] as const;

export default function VendorPaymentsPage() {
  const [source, setSource] = useState<(typeof sourceFilters)[number]>("ALL");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendor", "wallet-transactions", source],
    queryFn: () => {
      const filters =
        source === "ALL"
          ? { take: 150 }
          : {
              source,
              take: 150
            };
      return fetchVendorWalletTransactions(filters);
    }
  });

  const totals = (data ?? []).reduce(
    (acc, transaction) => {
      if (transaction.type === "CREDIT") acc.creditPaise += transaction.amountPaise;
      if (transaction.type === "DEBIT") acc.debitPaise += transaction.amountPaise;
      if (transaction.source === "REFUND") acc.refundPaise += transaction.amountPaise;
      return acc;
    },
    { creditPaise: 0, debitPaise: 0, refundPaise: 0 }
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-600">Track wallet credits, debits, and refunds.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Credits</p>
          <p className="text-2xl font-bold text-emerald-700">₹{(totals.creditPaise / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Debits</p>
          <p className="text-2xl font-bold text-rose-700">₹{(totals.debitPaise / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Refunds</p>
          <p className="text-2xl font-bold text-indigo-700">₹{(totals.refundPaise / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">Source filter</p>
        <select
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={source}
          onChange={(event) => setSource(event.target.value as (typeof sourceFilters)[number])}
        >
          {sourceFilters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading ? <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">Loading payment events...</p> : null}
        {isError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load payment events."}
          </p>
        ) : null}
        {!isLoading && !isError && (data?.length ?? 0) === 0 ? (
          <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">No payment transactions found for selected filter.</p>
        ) : null}
        {data?.map((transaction) => (
          <div key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{transaction.description}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${transaction.type === "CREDIT" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
              >
                {transaction.type}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900">₹{(transaction.amountPaise / 100).toFixed(2)}</p>
            <p className="text-xs text-slate-600">
              {transaction.wallet.user.name} • {transaction.source} • {new Date(transaction.createdAt).toLocaleString()}
            </p>
            {transaction.referenceId ? <p className="text-xs text-slate-500">Ref: {transaction.referenceId}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
