import NextAuth from "next-auth";

// Next-Auth 타입 확장
declare module "next-auth" {
  interface User {
    id: string;
    name?: string;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
} 