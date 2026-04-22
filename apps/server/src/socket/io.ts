import { Server as SocketIOServer } from "socket.io";

let ioRef: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioRef = io;
}

export function getSocketIO() {
  return ioRef;
}
