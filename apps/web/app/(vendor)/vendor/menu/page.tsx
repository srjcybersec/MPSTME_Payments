"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuItem,
  fetchMenuCategories,
  fetchVendorMenuItems,
  toggleMenuItemAvailability,
  updateMenuItemStock
} from "../../../../lib/api/menu";

export default function VendorMenuPage() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState("");
  const [newItemPriceRupees, setNewItemPriceRupees] = useState("0");
  const [newItemStock, setNewItemStock] = useState("0");
  const [newItemPrepTime, setNewItemPrepTime] = useState("10");
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deleteTargetItemId, setDeleteTargetItemId] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["vendor", "menu", "categories"],
    queryFn: fetchMenuCategories
  });
  const itemsQuery = useQuery({
    queryKey: ["vendor", "menu", "items"],
    queryFn: fetchVendorMenuItems
  });

  const createCategoryMutation = useMutation({
    mutationFn: createMenuCategory,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Category created.");
      setNewCategoryName("");
      void categoriesQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to create category.");
    }
  });
  const createItemMutation = useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Menu item created.");
      setNewItemName("");
      setNewItemDescription("");
      setNewItemPriceRupees("0");
      setNewItemStock("0");
      setNewItemPrepTime("10");
      void itemsQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to create menu item.");
    }
  });
  const toggleMutation = useMutation({
    mutationFn: toggleMenuItemAvailability,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Availability updated.");
      void itemsQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to toggle availability.");
    }
  });
  const updateStockMutation = useMutation({
    mutationFn: ({ itemId, stock }: { itemId: string; stock: number }) => updateMenuItemStock(itemId, stock),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Stock updated.");
      void itemsQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to update stock.");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess("Menu item removed.");
      void itemsQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(error instanceof Error ? error.message : "Unable to delete menu item.");
    }
  });

  const categories = categoriesQuery.data ?? [];
  const items = itemsQuery.data ?? [];
  const loading = categoriesQuery.isLoading || itemsQuery.isLoading;
  const fetchError = categoriesQuery.error ?? itemsQuery.error;
  const mutationPending =
    createCategoryMutation.isPending ||
    createItemMutation.isPending ||
    toggleMutation.isPending ||
    updateStockMutation.isPending ||
    deleteMutation.isPending;

  function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({ name: newCategoryName.trim() });
  }

  function handleCreateItem(event: FormEvent) {
    event.preventDefault();
    if (!newItemCategoryId || !newItemName.trim() || !newItemDescription.trim()) return;
    createItemMutation.mutate({
      categoryId: newItemCategoryId,
      name: newItemName.trim(),
      description: newItemDescription.trim(),
      pricePaise: Math.max(0, Math.round(Number(newItemPriceRupees) * 100)),
      currentStock: Math.max(0, Number(newItemStock)),
      preparationTimeMinutes: Math.max(1, Number(newItemPrepTime))
    });
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Menu Management</h1>
        <p className="mt-1 text-sm text-slate-600">Create categories, add items, and keep stock updated.</p>
      </div>
      {loading ? <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600">Loading menu controls...</p> : null}
      {fetchError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fetchError instanceof Error ? fetchError.message : "Failed to load vendor menu data."}
        </p>
      ) : null}
      {actionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p> : null}
      {actionSuccess ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionSuccess}</p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
      <form onSubmit={handleCreateCategory} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-base font-bold text-slate-900">1) Create Category</p>
        <div className="flex gap-2">
          <input
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Category name"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <button
            className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={mutationPending}
          >
            Add
          </button>
        </div>
      </form>

      <form onSubmit={handleCreateItem} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <p className="mb-3 text-base font-bold text-slate-900">2) Create Menu Item</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <select
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={newItemCategoryId}
            onChange={(event) => setNewItemCategoryId(event.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Item name"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
          />
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Description"
            value={newItemDescription}
            onChange={(event) => setNewItemDescription(event.target.value)}
          />
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Price (INR)"
            type="number"
            min="0"
            step="0.01"
            value={newItemPriceRupees}
            onChange={(event) => setNewItemPriceRupees(event.target.value)}
          />
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Current stock"
            type="number"
            min="0"
            value={newItemStock}
            onChange={(event) => setNewItemStock(event.target.value)}
          />
          <input
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Prep time (mins)"
            type="number"
            min="1"
            value={newItemPrepTime}
            onChange={(event) => setNewItemPrepTime(event.target.value)}
          />
        </div>
        <button className="mt-4 h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={mutationPending}>
          Create Item
        </button>
      </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-base font-bold text-slate-900">3) Existing Items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Item</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 text-sm">
                  <td className="px-5 py-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-5 py-3 text-slate-600">{item.category.name}</td>
                  <td className="px-5 py-3 text-slate-800">₹{(item.pricePaise / 100).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        className="h-10 w-24 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                        type="number"
                        min="0"
                        value={stockDrafts[item.id] ?? String(item.currentStock)}
                        onChange={(event) =>
                          setStockDrafts((current) => ({
                            ...current,
                            [item.id]: event.target.value
                          }))
                        }
                      />
                      <button
                        className="h-10 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                        type="button"
                        disabled={mutationPending}
                        onClick={() =>
                          updateStockMutation.mutate({
                            itemId: item.id,
                            stock: Math.max(0, Number(stockDrafts[item.id] ?? item.currentStock))
                          })
                        }
                      >
                        Update
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.isAvailable ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        type="button"
                        disabled={mutationPending}
                        onClick={() => toggleMutation.mutate(item.id)}
                      >
                        Toggle
                      </button>
                      <button
                        className="h-10 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                        type="button"
                        disabled={mutationPending}
                        onClick={() => setDeleteTargetItemId(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-600">No items yet. Create your first menu item.</p>
        ) : null}
      </div>

      {deleteTargetItemId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Delete menu item?</h2>
            <p className="mt-2 text-sm text-slate-600">This will hide the item from students immediately.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                onClick={() => setDeleteTargetItemId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                type="button"
                disabled={mutationPending}
                onClick={() => {
                  if (!deleteTargetItemId) return;
                  setActionError(null);
                  setActionSuccess(null);
                  deleteMutation.mutate(deleteTargetItemId);
                  setDeleteTargetItemId(null);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
