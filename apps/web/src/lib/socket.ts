'use client';

import { io, type Socket } from 'socket.io-client';
import { authStore } from './auth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

let socket: Socket | null = null;

/** Lazily creates a singleton authenticated socket connection. */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(WS_URL, {
    transports: ['websocket'],
    auth: { token: authStore.getAccessToken() ?? '' },
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
