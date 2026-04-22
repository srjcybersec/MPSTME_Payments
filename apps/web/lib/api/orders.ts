"use client";

import { apiFetch } from "./client";

export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COLLECTED" | "CANCELLED";

export type Order = {
  id: string;
  status: OrderStatus;
  totalAmountPaise: number;
  paymentMethod: "WALLET" | "RAZORPAY";
  createdAt: string;
  studentId: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPricePaise: number;
    menuItemId: string;
  }>;
};

export type VendorOrder = Order & {
  receipt?: { id: string; qrCodeData: string };
  student: { id: string; name: string; email: string };
};

export async function createWalletOrder(payload: {
  items: Array<{ menuItemId: string; quantity: number }>;
  orderNotes?: string;
}) {
  return apiFetch<{ order: Order; unavailableItems: Array<{ menuItemId: string; reason: string }> }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      paymentMethod: "WALLET"
    })
  });
}

export async function createDirectOrderPayment(payload: {
  items: Array<{ menuItemId: string; quantity: number }>;
  amountPaise: number;
  orderNotes?: string;
}) {
  return apiFetch<{
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
  }>("/payments/create-order", {
    method: "POST",
    headers: {
      "x-idempotency-key": `order-direct-${Date.now()}-${Math.random().toString(36).slice(2)}`
    },
    body: JSON.stringify({
      amountPaise: payload.amountPaise,
      purpose: "ORDER_DIRECT",
      orderIntent: {
        items: payload.items,
        ...(payload.orderNotes ? { orderNotes: payload.orderNotes } : {})
      }
    })
  });
}

export async function fetchMyOrders() {
  return apiFetch<Order[]>("/orders");
}

export async function fetchOrderById(orderId: string) {
  return apiFetch<
    Order & {
      receipt?: {
        id: string;
        qrCodeData: string;
      };
    }
  >(`/orders/${orderId}`);
}

export async function fetchVendorQueue() {
  return apiFetch<Order[]>("/orders/queue");
}

export async function fetchVendorOrderHistory(status?: OrderStatus | "ALL", take = 100) {
  const params = new URLSearchParams();
  params.set("take", String(take));
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  return apiFetch<VendorOrder[]>(`/orders/vendor/history?${params.toString()}`);
}

export async function updateOrderStatus(orderId: string, status: "PREPARING" | "READY" | "COLLECTED" | "CANCELLED") {
  return apiFetch<Order | { message: string }>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function collectOrderByQr(orderId: string, qrCodeData: string) {
  return apiFetch<Order>(`/orders/${orderId}/collect`, {
    method: "POST",
    body: JSON.stringify({ qrCodeData })
  });
}
