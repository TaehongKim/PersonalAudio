import { PrismaClient } from "@prisma/client";
import type { Server } from "socket.io";

declare global {
  var prisma: PrismaClient | undefined;
  var io: Server | undefined;
  var __prisma: PrismaClient | undefined;

  interface GlobalThis {
    io?: Server;
    prisma?: PrismaClient;
    __prisma?: PrismaClient;
  }
}

namespace NodeJS {
  interface Global {
    __prisma: PrismaClient | undefined;
  }
}

export {}; 