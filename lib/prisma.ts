import { PrismaClient } from "@prisma/client";

const _global = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma = _global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  _global.prisma = prisma;
} 