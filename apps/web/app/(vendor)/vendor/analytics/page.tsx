"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../../lib/api/client";

type RevenuePayload = {
  totalPaise: number;
  walletPaise: number;
  razorpayPaise: number;
  orderCount: number;
};

type PopularItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  revenuePaise: number;
};

type PeakHour = {
  hour: number;
  day: number;
  count: number;
};

type StudentsPayload = {
  activeStudents: number;
  dailyActive: Array<{ date: string; count: number }>;
};

export default function VendorAnalyticsPage() {
  const revenueQuery = useQuery({
    queryKey: ["analytics", "revenue"],
    queryFn: () => apiFetch<RevenuePayload>("/analytics/revenue")
  });
  const popularItemsQuery = useQuery({
    queryKey: ["analytics", "popular-items"],
    queryFn: () => apiFetch<PopularItem[]>("/analytics/popular-items")
  });
  const peakHoursQuery = useQuery({
    queryKey: ["analytics", "peak-hours"],
    queryFn: () => apiFetch<PeakHour[]>("/analytics/peak-hours")
  });
  const studentsQuery = useQuery({
    queryKey: ["analytics", "students"],
    queryFn: () => apiFetch<StudentsPayload>("/analytics/students")
  });
  const loading =
    revenueQuery.isLoading || popularItemsQuery.isLoading || peakHoursQuery.isLoading || studentsQuery.isLoading;
  const fetchError = revenueQuery.error ?? popularItemsQuery.error ?? peakHoursQuery.error ?? studentsQuery.error;
  const revenue = revenueQuery.data;
  const popularItems = popularItemsQuery.data ?? [];
  const peakHours = peakHoursQuery.data ?? [];
  const students = studentsQuery.data;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Simple business snapshot for daily decisions.</p>
      </div>
      {loading ? <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">Loading analytics...</p> : null}
      {fetchError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fetchError instanceof Error ? fetchError.message : "Unable to load analytics data."}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900">₹{((revenue?.totalPaise ?? 0) / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orders</p>
          <p className="text-2xl font-bold text-slate-900">{revenue?.orderCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wallet Share</p>
          <p className="text-2xl font-bold text-slate-900">₹{((revenue?.walletPaise ?? 0) / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Students</p>
          <p className="text-2xl font-bold text-slate-900">{students?.activeStudents ?? 0}</p>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-bold text-slate-900">Top Items</p>
          <div className="space-y-2 text-sm text-slate-700">
            {popularItems?.slice(0, 5).map((item) => (
              <div key={item.menuItemId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{item.name}</span>
                <span className="font-semibold">{item.quantity}</span>
              </div>
            ))}
            {!loading && popularItems.length === 0 ? <p className="text-xs text-slate-500">No item data available.</p> : null}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-base font-bold text-slate-900">Peak Slots</p>
          <div className="space-y-2 text-sm text-slate-700">
            {peakHours?.slice(0, 5).map((slot) => (
              <div key={`${slot.day}-${slot.hour}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>
                  Day {slot.day}, {slot.hour}:00
                </span>
                <span className="font-semibold">{slot.count}</span>
              </div>
            ))}
            {!loading && peakHours.length === 0 ? <p className="text-xs text-slate-500">No peak slot data available.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
