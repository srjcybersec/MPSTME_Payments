"use client";

import { calculateOfflineSpendTodayPaise } from "./logic";

export type OfflineQueueRecord = {
  localOrderId: string;
  amountPaise: number;
  timestamp: string;
  deviceId: string;
  nonce: string;
  signature: string;
};

const DB_NAME = "mpstme-offline";
const STORE_NAME = "wallet-sync-queue";
const CACHE_STORE = "wallet-cache";
const MENU_CACHE_KEY = "menu-cache";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "nonce" });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineQueue(): Promise<OfflineQueueRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result ?? []) as OfflineQueueRecord[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueueRecords(nonces: string[]) {
  if (nonces.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const nonce of nonces) {
      store.delete(nonce);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addOfflineQueueRecord(record: OfflineQueueRecord) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedWalletBalancePaise() {
  const db = await openDb();
  return new Promise<number | null>((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readonly");
    const request = tx.objectStore(CACHE_STORE).get("wallet-balance");
    request.onsuccess = () => resolve((request.result?.value as number | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedWalletBalancePaise(balancePaise: number) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readwrite");
    tx.objectStore(CACHE_STORE).put({ key: "wallet-balance", value: balancePaise });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedMenu(): Promise<{ updatedAt: string; data: unknown } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readonly");
    const request = tx.objectStore(CACHE_STORE).get(MENU_CACHE_KEY);
    request.onsuccess = () =>
      resolve((request.result?.value as { updatedAt: string; data: unknown } | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedMenu(data: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readwrite");
    tx.objectStore(CACHE_STORE).put({
      key: MENU_CACHE_KEY,
      value: {
        updatedAt: new Date().toISOString(),
        data
      }
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineSpendTodayPaise() {
  const records = await getOfflineQueue();
  return calculateOfflineSpendTodayPaise(records);
}

export function getDeviceId() {
  const key = "mpstme-device-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

export async function signOfflineRecord(input: string, accessToken: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(accessToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
