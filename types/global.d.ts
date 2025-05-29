import { PrismaClient } from "@prisma/client";
import type { Server as SocketIOServer } from 'socket.io';

declare global {
  var prisma: PrismaClient | undefined;
  var io: SocketIOServer | undefined;
}

export {}; 