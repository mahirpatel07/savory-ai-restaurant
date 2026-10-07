import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://0.0.0.0:5173,http://192.168.1.218:5173,http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-admin', () => {
      socket.join('admin-room');
    });

    socket.on('join-chat', () => {
      socket.join('chat-room');
    });

    socket.on('disconnect', () => {
      // no-op
    });
  });

  return io;
}

export function emitReservationEvent(eventName, payload) {
  if (!io) return;
  io.to('admin-room').emit(eventName, payload);
  io.to('chat-room').emit(eventName, payload);
}
