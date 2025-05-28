import { PrismaClient } from "@prisma/client";

// PrismaClient 인스턴스를 전역 변수로 선언
// 개발 환경에서 핫 리로딩으로 인한 다중 인스턴스 생성 방지
declare global {
  let prisma: PrismaClient | undefined;
}

// 개발 환경에서는 전역 prisma 객체 재사용, 프로덕션에서는 새로 생성
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
} 