import { io } from 'socket.io-client';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001';

let socket;

/**
 * Returns a singleton instance of the Socket.IO client.
 * This prevents multiple redundant connections across components.
 */
export const getSocket = () => {
  if (!socket && typeof window !== 'undefined') {
    socket = io(API_BASE, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('%c✔ Socket connected:', 'color: #10b981; font-weight: bold;', socket.id);
    });

    socket.on('connect_error', (_error) => {
      // Avoid spamming the console
      if (socket.active) {
        console.warn('Socket connection lost. Retrying...');
      }
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect();
      }
      console.log('%c✖ Socket disconnected:', 'color: #ef4444; font-weight: bold;', reason);
    });
  }
  return socket;
};
