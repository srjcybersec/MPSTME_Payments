"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { adminAdjustStudentWallet, fetchVendorStudents, setStudentFrozen } from "../../../../lib/api/wallet";

export default function VendorStudentsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amountRupees, setAmountRupees] = useState("0");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [freezeTarget, setFreezeTarget] = useState<{ id: string; isFrozen: boolean; name: string } | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["vendor", "students"],
    queryFn: fetchVendorStudents
  });

  const freezeMutation = useMutation({
    mutationFn: ({ studentId, isFrozen }: { studentId: string; isFrozen: boolean }) => setStudentFrozen(studentId, isFrozen),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Student status updated.");
      void studentsQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to update student status.");
    }
  });
  const adjustMutation = useMutation({
    mutationFn: adminAdjustStudentWallet,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Wallet adjustment applied.");
      setAmountRupees("0");
      setReason("");
      void studentsQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to adjust student wallet.");
    }
  });

  function handleAdjust(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudentId || !reason.trim()) return;
    adjustMutation.mutate({
      studentId: selectedStudentId,
      amountPaise: Math.round(Number(amountRupees) * 100),
      reason: reason.trim()
    });
  }

  const students = studentsQuery.data ?? [];
  const busy = freezeMutation.isPending || adjustMutation.isPending;
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-600">Manage account access and wallet adjustments.</p>
      </div>

      {studentsQuery.isLoading ? <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">Loading students...</p> : null}
      {studentsQuery.isError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {studentsQuery.error instanceof Error ? studentsQuery.error.message : "Unable to load students."}
        </p>
      ) : null}
      {actionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p> : null}
      {actionSuccess ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionSuccess}</p>
      ) : null}

      <form onSubmit={handleAdjust} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-base font-bold text-slate-900">Wallet Adjustment</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            type="number"
            step="0.01"
            placeholder="Amount in INR (+/-)"
            value={amountRupees}
            onChange={(event) => setAmountRupees(event.target.value)}
          />
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {selectedStudent ? `Current balance: ₹${((selectedStudent.wallet?.balancePaise ?? 0) / 100).toFixed(2)}` : "Select a student to adjust wallet"}
          </p>
          <button
            className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
          {adjustMutation.isPending ? "Applying..." : "Apply Adjustment"}
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {!studentsQuery.isLoading && !studentsQuery.isError && students.length === 0 ? (
          <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">No students found.</p>
        ) : null}
        {students.map((student) => (
          <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900">{student.name}</p>
                <p className="text-sm text-slate-600">{student.email}</p>
                <p className="text-xs text-slate-500">{student.studentId ?? "No student ID"}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  student.isFrozen ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {student.isFrozen ? "Frozen" : "Active"}
              </span>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wallet Balance</p>
              <p className="text-2xl font-bold text-slate-900">₹{(((student.wallet?.balancePaise ?? 0) as number) / 100).toFixed(2)}</p>
            </div>
            <button
              className={`mt-3 h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50 ${
                student.isFrozen ? "bg-emerald-600" : "bg-rose-600"
              }`}
              type="button"
              disabled={busy}
              onClick={() =>
                setFreezeTarget({
                  id: student.id,
                  isFrozen: student.isFrozen,
                  name: student.name
                })
              }
            >
              {student.isFrozen ? "Unfreeze" : "Freeze"}
            </button>
          </article>
        ))}
      </div>

      {freezeTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{freezeTarget.isFrozen ? "Unfreeze student?" : "Freeze student?"}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {freezeTarget.name} will be {freezeTarget.isFrozen ? "restored to active status." : "blocked from using wallet/orders until unfreezed."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                onClick={() => setFreezeTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`h-10 rounded-lg px-3 text-sm font-semibold text-white disabled:opacity-50 ${
                  freezeTarget.isFrozen ? "bg-emerald-600" : "bg-rose-600"
                }`}
                type="button"
                disabled={busy}
                onClick={() => {
                  freezeMutation.mutate({ studentId: freezeTarget.id, isFrozen: !freezeTarget.isFrozen });
                  setFreezeTarget(null);
                }}
              >
                {freezeTarget.isFrozen ? "Yes, Unfreeze" : "Yes, Freeze"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
