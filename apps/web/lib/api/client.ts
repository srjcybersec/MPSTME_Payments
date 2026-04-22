"use client";

import { useAppStore } from "../../store/app-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
let csrfTokenCache: string | null = null;

function mergeAbortSignals(userSignal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  if (userSignal) {
    const controller = new AbortController();
    const onAbort = () => controller.abort(userSignal.reason);
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
      return controller.signal;
    }
    userSignal.addEventListener("abort", onAbort, { once: true });
    const t = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
    controller.signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        userSignal.removeEventListener("abort", onAbort);
      },
      { once: true }
    );
    return controller.signal;
  }
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  return controller.signal;
}

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const fallbackMessage = response.statusText || "Request failed";
  try {
    const raw = await response.text();
    if (!raw) {
      return { success: false, error: { code: "EMPTY_RESPONSE", message: fallbackMessage } };
    }
    try {
      return JSON.parse(raw) as ApiResponse<T>;
    } catch {
      return {
        success: false,
        error: { code: "NON_JSON_RESPONSE", message: raw.trim() || fallbackMessage }
      };
    }
  } catch {
    return { success: false, error: { code: "INVALID_RESPONSE", message: fallbackMessage } };
  }
}

async function refreshAccessTokenFromCookie(): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) return null;
  const payload = await parseApiResponse<{ accessToken: string }>(response);
  return payload.success && payload.data?.accessToken ? payload.data.accessToken : null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  let token = useAppStore.getState().accessToken;

  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS" && !csrfTokenCache) {
    const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      credentials: "include",
      signal: mergeAbortSignals(undefined, DEFAULT_FETCH_TIMEOUT_MS)
    });
    const csrfPayload = await parseApiResponse<{ csrfToken: string }>(csrfResponse);
    csrfTokenCache = csrfPayload.data?.csrfToken ?? null;
  }

  const makeRequest = (authToken: string | null) => {
    const { signal: _ignoredSignal, ...initWithoutSignal } = init ?? {};
    return fetch(`${API_BASE_URL}${path}`, {
      ...initWithoutSignal,
      credentials: "include",
      signal: mergeAbortSignals(init?.signal ?? null, DEFAULT_FETCH_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(csrfTokenCache && method !== "GET" && method !== "HEAD" && method !== "OPTIONS"
          ? { "x-csrf-token": csrfTokenCache }
          : {}),
        ...(init?.headers ?? {})
      }
    });
  };

  let response = await makeRequest(token);
  if (response.status === 401 && path !== "/auth/refresh" && path !== "/auth/login" && path !== "/auth/register") {
    const refreshedToken = await refreshAccessTokenFromCookie();
    if (refreshedToken) {
      useAppStore.getState().setAccessToken(refreshedToken);
      token = refreshedToken;
      response = await makeRequest(token);
    } else {
      useAppStore.getState().setAccessToken(null);
      useAppStore.getState().setRole(null);
      useAppStore.getState().setUserId(null);
      useAppStore.getState().setUserProfile(null, null);
    }
  }

  const payload = await parseApiResponse<T>(response);
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}
