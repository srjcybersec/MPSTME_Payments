"use client";

import { apiFetch } from "./client";

type WalletTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amountPaise: number;
  description: string;
  createdAt: string;
};

type WalletPayload = {
  id: string;
  balancePaise: number;
  transactions: WalletTransaction[];
};

export type VendorStudentWallet = {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  isFrozen: boolean;
  wallet: {
    balancePaise: number;
    dailyOfflineSpendPaise: number;
    updatedAt: string;
  } | null;
};

export type VendorWalletTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amountPaise: number;
  description: string;
  source: "RAZORPAY" | "WALLET_SYNC" | "REFUND" | "MANUAL";
  referenceId: string | null;
  createdAt: string;
  wallet: {
    id: string;
    userId: string;
    user: {
      name: string;
      email: string;
    };
  };
};

export async function fetchWallet() {
  return apiFetch<WalletPayload>("/wallet");
}

export async function createWalletTopupOrder(amountPaise: number) {
  return apiFetch<{
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
  }>("/payments/create-order", {
    method: "POST",
    headers: {
      "x-idempotency-key": `topup-${Date.now()}-${Math.random().toString(36).slice(2)}`
    },
    body: JSON.stringify({
      amountPaise,
      purpose: "WALLET_TOPUP"
    })
  });
}

export async function syncOfflineWalletQueue(records: Array<{
  localOrderId: string;
  amountPaise: number;
  timestamp: string;
  deviceId: string;
  nonce: string;
  signature: string;
}>) {
  return apiFetch<{
    results: Array<{ localOrderId: string; status: string; failureReason?: string }>;
    newBalance: number;
  }>("/wallet/sync", {
    method: "POST",
    body: JSON.stringify({ records })
  });
}

export async function fetchVendorStudents() {
  return apiFetch<VendorStudentWallet[]>("/wallet/students");
}

export async function setStudentFrozen(studentId: string, isFrozen: boolean) {
  return apiFetch<{ id: string; isFrozen: boolean }>(`/wallet/students/${studentId}/freeze`, {
    method: "PATCH",
    body: JSON.stringify({ isFrozen })
  });
}

export async function adminAdjustStudentWallet(payload: {
  studentId: string;
  amountPaise: number;
  reason: string;
}) {
  return apiFetch<{ id: string; balancePaise: number }>("/wallet/admin-adjust", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchVendorWalletTransactions(filters?: {
  studentId?: string;
  source?: "RAZORPAY" | "WALLET_SYNC" | "REFUND" | "MANUAL";
  take?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.studentId) params.set("studentId", filters.studentId);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.take) params.set("take", String(filters.take));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<VendorWalletTransaction[]>(`/wallet/transactions${suffix}`);
}
