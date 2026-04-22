"use client";

import { apiFetch } from "./client";

type LoginPayload = {
  accessToken: string;
  user: {
    id: string;
    role: "STUDENT" | "VENDOR";
    email: string;
    name: string;
  };
};

export async function login(email: string, password: string) {
  return apiFetch<LoginPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function refreshAccessToken() {
  return apiFetch<{ accessToken: string }>("/auth/refresh", {
    method: "POST"
  });
}

export async function logoutAllSessions(accessToken: string) {
  return apiFetch<{ message: string }>("/auth/sessions", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function getSessions() {
  return apiFetch<Array<{ id: string; lastSeenAt: string; ipAddress: string | null; userAgent: string | null }>>(
    "/auth/sessions"
  );
}

export async function removeSession(sessionId: string) {
  return apiFetch<{ message: string }>(`/auth/sessions/${sessionId}`, {
    method: "DELETE"
  });
}
