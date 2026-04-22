"use client";

import { create } from "zustand";

type Toast = {
  id: string;
  message: string;
  type: "info" | "success" | "error";
};

type ToastState = {
  toasts: Toast[];
  pushToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message, type = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}));
