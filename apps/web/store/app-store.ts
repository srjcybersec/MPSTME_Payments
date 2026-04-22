"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "dark" | "light";
type Role = "STUDENT" | "VENDOR";

type CartItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
};

type AppState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  role: Role | null;
  setRole: (role: Role | null) => void;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  userName: string | null;
  userEmail: string | null;
  setUserProfile: (name: string | null, email: string | null) => void;
  pushNotificationsEnabled: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (menuItemId: string) => void;
  clearCart: () => void;
  cartTotalPaise: () => number;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      accessToken: null,
      setAccessToken: (token) => set({ accessToken: token }),
      role: null,
      setRole: (role) => set({ role }),
      userId: null,
      setUserId: (userId) => set({ userId }),
      userName: null,
      userEmail: null,
      setUserProfile: (name, email) => set({ userName: name, userEmail: email }),
      pushNotificationsEnabled: true,
      setPushNotificationsEnabled: (enabled) => set({ pushNotificationsEnabled: enabled }),
      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((cartItem) => cartItem.menuItemId === item.menuItemId);
          if (existing) {
            return {
              cart: state.cart.map((cartItem) =>
                cartItem.menuItemId === item.menuItemId
                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                  : cartItem
              )
            };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        }),
      removeFromCart: (menuItemId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.menuItemId !== menuItemId)
        })),
      clearCart: () => set({ cart: [] }),
      cartTotalPaise: () => get().cart.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0)
    }),
    {
      name: "mpstme-app-store",
      partialize: (state) => ({
        theme: state.theme,
        accessToken: state.accessToken,
        role: state.role,
        userId: state.userId,
        userName: state.userName,
        userEmail: state.userEmail,
        pushNotificationsEnabled: state.pushNotificationsEnabled,
        cart: state.cart
      })
    }
  )
);
