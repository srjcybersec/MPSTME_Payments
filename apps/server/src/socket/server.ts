import { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server as SocketIOServer } from "socket.io";
import { verifyAccessToken } from "../lib/jwt.js";
import { redis } from "../lib/redis.js";
import { env } from "../lib/env.js";
import { setSocketIO } from "./io.js";

export function initializeSocketServer(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true
    }
  });

  const pubClient = redis;
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("student:join", ({ userId }: { userId: string }) => {
      socket.join(`student:${userId}`);
    });

    socket.on("vendor:join", () => {
      socket.join("vendor");
    });
  });

  setSocketIO(io);
  return io;
}
