import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

// API 라우트 핸들러 내보내기
export { handler as GET, handler as POST }; 