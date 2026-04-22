"use client";

import { io, Socket } from "socket.io-client";

let socketRef: Socket | null = null;

export function getSocket(token?: string) {
  if (!socketRef) {
    socketRef = io(process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") ?? "http://localhost:4000", {
      autoConnect: false,
      auth: token ? { token } : {}
    });
  }
  return socketRef;
}
