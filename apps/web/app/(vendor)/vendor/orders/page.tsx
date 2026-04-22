"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVendorOrderHistory, OrderStatus } from "../../../../lib/api/orders";

const statuses: Array<OrderStatus | "ALL"> = ["ALL", "PENDING", "CONFIRMED", "PREPARING", "READY", "COLLECTED", "CANCELLED"];

export default function VendorOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendor", "orders", "history", status],
    queryFn: () => fetchVendorOrderHistory(status, 150)
  });

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Order History</h1>
        <p className="mt-1 text-sm text-slate-600">Review past orders and status outcomes.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-700">Status filter</p>
        <select
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus | "ALL")}
        >
          {statuses.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {isLoading ? <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">Loading orders...</p> : null}
        {isError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load order history."}
          </p>
        ) : null}
        {!isLoading && !isError && (data?.length ?? 0) === 0 ? (
          <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">No orders found for selected filter.</p>
        ) : null}
        {(data?.length ?? 0) > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100 text-sm">
                      <td className="px-5 py-3 font-semibold text-slate-900">#{order.id.slice(-6)}</td>
                      <td className="px-5 py-3 text-slate-700">
                        {order.student.name}
                        <p className="text-xs text-slate-500">{order.student.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{new Date(order.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-700">{order.paymentMethod}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">₹{(order.totalAmountPaise / 100).toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
