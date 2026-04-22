"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchMenuWithMeta } from "../../../lib/api/menu";
import { useAppStore } from "../../../store/app-store";
import { createDirectOrderPayment, createWalletOrder } from "../../../lib/api/orders";
import { ensureRazorpayLoaded } from "../../../lib/payments/razorpay";
import { useToastStore } from "../../../store/toast-store";
import {
  addOfflineQueueRecord,
  getCachedWalletBalancePaise,
  getDeviceId,
  getOfflineSpendTodayPaise,
  setCachedWalletBalancePaise,
  signOfflineRecord
} from "../../../lib/offline/queue";
import { canQueueOfflineOrder } from "../../../lib/offline/logic";
import { fetchWallet } from "../../../lib/api/wallet";

export default function StudentMenuPage() {
  const addToCart = useAppStore((s) => s.addToCart);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const userId = useAppStore((s) => s.userId);
  const userName = useAppStore((s) => s.userName);
  const userEmail = useAppStore((s) => s.userEmail);
  const cart = useAppStore((s) => s.cart);
  const clearCart = useAppStore((s) => s.clearCart);
  const token = useAppStore((s) => s.accessToken);
  const totalPaise = useAppStore((s) => s.cartTotalPaise());
  const pushToast = useToastStore((s) => s.pushToast);
  const [cachedWalletBalance, setCachedWalletBalance] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnlineState);
    window.addEventListener("offline", handleOnlineState);
    return () => {
      window.removeEventListener("online", handleOnlineState);
      window.removeEventListener("offline", handleOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchWallet()
      .then((wallet) => {
        setCachedWalletBalance(wallet.balancePaise);
        return setCachedWalletBalancePaise(wallet.balancePaise);
      })
      .catch(async () => {
        const localBalance = await getCachedWalletBalancePaise();
        setCachedWalletBalance(localBalance);
      });
  }, [token]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenuWithMeta
  });
  const checkoutMutation = useMutation({
    mutationFn: createWalletOrder,
    onSuccess: () => {
      clearCart();
    }
  });
  const directPayMutation = useMutation({
    mutationFn: createDirectOrderPayment,
    onSuccess: () => {
      clearCart();
      pushToast("Payment started. Order will confirm after webhook verification.", "info");
    }
  });
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const quantityByItemId = useMemo(
    () =>
      cart.reduce<Record<string, number>>((acc, item) => {
        acc[item.menuItemId] = item.quantity;
        return acc;
      }, {}),
    [cart]
  );

  const sourceLabel =
    data?.source === "network" ? "Network Live" : data?.source === "online-cache" ? "Online Cache" : "Offline Cache";

  return (
    <section className="space-y-5 p-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Fresh Menu</h1>
          <p className="mt-1 text-sm text-zinc-400">Browse, add items, and checkout instantly.</p>
        </div>
        <div className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-300">
          {sourceLabel ?? "Loading..."}
        </div>
      </div>

      {!isOnline ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Offline mode enabled. Orders will be queued locally if wallet rules are satisfied.
        </div>
      ) : null}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((skeleton) => (
            <div key={skeleton} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : null}
      {error ? <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">Failed to load menu.</p> : null}
      {data && data.source !== "network" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-100">
          Showing cached menu ({data.source === "offline-cache" ? "offline cache" : "local cache"}).
          {data.updatedAt ? ` Last updated ${new Date(data.updatedAt).toLocaleTimeString()}.` : ""}
        </div>
      ) : null}

      {data?.data.map((category) => (
        <div key={category.id} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{category.name}</h2>
          <div className="space-y-3">
            {category.items.map((item) => {
              const qty = quantityByItemId[item.id] ?? 0;
              const isAvailable = item.isAvailable && item.currentStock > 0;
              return (
                <div key={item.id} className="interactive-card overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-zinc-100">{item.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {item.preparationTimeMinutes} min prep · Stock {item.currentStock}
                      </p>
                      {!isAvailable ? (
                        <span className="mt-2 inline-block rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-200">
                          Not available
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-teal-300">₹{(item.pricePaise / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">{qty > 0 ? `${qty} in cart` : "Tap add to include in cart"}</p>
                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <button
                          className="interactive-btn rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200"
                          onClick={() => removeFromCart(item.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                      <button
                        className="interactive-btn rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!isAvailable}
                        onClick={() =>
                          addToCart({
                            menuItemId: item.id,
                            name: item.name,
                            unitPricePaise: item.pricePaise
                          })
                        }
                        type="button"
                      >
                        Add +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="fixed bottom-24 left-0 right-0 z-30 mx-auto w-full max-w-md px-4">
        <div className="interactive-card rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Cart total</p>
              <p className="text-xl font-bold text-zinc-50">
                ₹{(totalPaise / 100).toFixed(2)} <span className="text-xs font-normal text-zinc-400">({cartItemCount} items)</span>
              </p>
            </div>
            <p className="text-xs text-zinc-400">{isOnline ? "Online" : "Offline"}</p>
          </div>

          <div className="space-y-2">
            <button
              className="interactive-btn h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 disabled:opacity-50"
              disabled={cart.length === 0 || checkoutMutation.isPending}
              onClick={async () => {
                const items = cart.map((item) => ({
                  menuItemId: item.menuItemId,
                  quantity: item.quantity
                }));

                if (isOnline) {
                  checkoutMutation.mutate({ items });
                  return;
                }

                const localBalance = cachedWalletBalance ?? 0;
                if (localBalance < totalPaise) {
                  pushToast("Insufficient offline wallet balance", "error");
                  return;
                }
                const spentToday = await getOfflineSpendTodayPaise();
                const guard = canQueueOfflineOrder({
                  localBalancePaise: localBalance,
                  orderAmountPaise: totalPaise,
                  spentTodayPaise: spentToday
                });
                if (!guard.withinDailyLimit) {
                  pushToast("Offline daily limit exceeded (₹500/day). Sync required.", "error");
                  return;
                }
                if (!token) {
                  pushToast("Please login again before offline checkout", "error");
                  return;
                }

                const localOrderId = crypto.randomUUID();
                const nonce = crypto.randomUUID();
                const timestamp = new Date().toISOString();
                const deviceId = getDeviceId();
                const payload = JSON.stringify({
                  localOrderId,
                  amountPaise: totalPaise,
                  timestamp,
                  deviceId,
                  nonce
                });
                const signature = await signOfflineRecord(payload, token);
                await addOfflineQueueRecord({
                  localOrderId,
                  amountPaise: totalPaise,
                  timestamp,
                  deviceId,
                  nonce,
                  signature
                });
                const next = localBalance - totalPaise;
                setCachedWalletBalance(next);
                await setCachedWalletBalancePaise(next);
                clearCart();
                pushToast("Order queued offline. Will sync when online.", "success");
              }}
              type="button"
            >
              {checkoutMutation.isPending
                ? "Placing order..."
                : isOnline
                  ? "Checkout with Wallet"
                  : "Queue Offline Wallet Order"}
            </button>
            <button
              className="interactive-btn h-11 w-full rounded-xl border border-indigo-400/40 bg-indigo-500/10 text-sm font-semibold text-indigo-200 disabled:opacity-50"
              disabled={cart.length === 0 || directPayMutation.isPending}
              onClick={async () => {
                const loaded = await ensureRazorpayLoaded();
                if (!loaded) return;

                const order = await directPayMutation.mutateAsync({
                  items: cart.map((item) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity
                  })),
                  amountPaise: totalPaise
                });

                const Razorpay = window.Razorpay;
                if (!Razorpay) return;
                const instance = new Razorpay({
                  key: order.keyId,
                  amount: order.amountPaise,
                  currency: order.currency,
                  order_id: order.razorpayOrderId,
                  name: "MPSTME Smart Canteen",
                  description: "Direct order payment",
                  prefill: {
                    name: userName ?? "Student",
                    ...(userEmail ? { email: userEmail } : {})
                  },
                  theme: { color: "#5F3BFF" },
                  handler: () => {
                    pushToast("Payment submitted. Awaiting secure confirmation...", "info");
                  }
                });
                instance.open();
              }}
              type="button"
            >
              {directPayMutation.isPending ? "Creating payment order..." : "Pay via UPI/Card (Razorpay)"}
            </button>
          </div>

          {checkoutMutation.isError ? <p className="mt-2 text-xs text-rose-300">{checkoutMutation.error.message}</p> : null}
          {directPayMutation.isError ? <p className="mt-1 text-xs text-rose-300">{directPayMutation.error.message}</p> : null}
          {checkoutMutation.isSuccess ? <p className="mt-1 text-xs text-emerald-300">Order placed successfully.</p> : null}
        </div>
      </div>
      <div className="h-56" />
    </section>
  );
}
