"use client";

import { apiFetch } from "./client";
import { getCachedMenu, setCachedMenu } from "../offline/queue";
import { shouldUseCachedMenu } from "./menu-cache";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  preparationTimeMinutes: number;
  isVeg: boolean;
  currentStock: number;
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

export type VendorMenuItem = MenuItem & {
  categoryId: string;
  lowStockThreshold: number;
  tags: string[];
  sortOrder: number;
  createdAt: string;
  category: { id: string; name: string };
};

export async function fetchMenuWithMeta() {
  const ttlMs = 5 * 60 * 1000;
  if (!navigator.onLine) {
    const cached = await getCachedMenu();
    return {
      data: (cached?.data as MenuCategory[] | undefined) ?? [],
      source: "offline-cache" as const,
      updatedAt: cached?.updatedAt ?? null
    };
  }

  const cached = await getCachedMenu();
  if (cached) {
    if (shouldUseCachedMenu(cached.updatedAt, Date.now(), ttlMs)) {
      return {
        data: cached.data as MenuCategory[],
        source: "online-cache" as const,
        updatedAt: cached.updatedAt
      };
    }
  }

  const fresh = await apiFetch<MenuCategory[]>("/menu");
  await setCachedMenu(fresh);
  return {
    data: fresh,
    source: "network" as const,
    updatedAt: new Date().toISOString()
  };
}

export async function fetchMenu() {
  const result = await fetchMenuWithMeta();
  return result.data;
}

export async function fetchMenuCategories() {
  return apiFetch<Array<{ id: string; name: string; sortOrder: number; isActive: boolean }>>("/menu/categories");
}

export async function fetchVendorMenuItems() {
  return apiFetch<VendorMenuItem[]>("/menu/items");
}

export async function createMenuCategory(payload: { name: string; sortOrder?: number }) {
  return apiFetch<{ id: string; name: string }>("/menu/categories", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createMenuItem(payload: {
  categoryId: string;
  name: string;
  description: string;
  pricePaise: number;
  currentStock: number;
  preparationTimeMinutes: number;
}) {
  return apiFetch<VendorMenuItem>("/menu/items", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      isVeg: true,
      tags: []
    })
  });
}

export async function toggleMenuItemAvailability(itemId: string) {
  return apiFetch<VendorMenuItem>(`/menu/items/${itemId}/toggle`, {
    method: "PATCH"
  });
}

export async function updateMenuItemStock(itemId: string, currentStock: number) {
  return apiFetch<VendorMenuItem>(`/menu/items/${itemId}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ currentStock })
  });
}

export async function deleteMenuItem(itemId: string) {
  return apiFetch<{ message: string }>(`/menu/items/${itemId}`, {
    method: "DELETE"
  });
}
