import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { validatePassword } from "@/lib/auth";

// NextAuth 설정
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      // 인증 제공자 이름
      name: "비밀번호",
      
      // 사용자에게 보여질 폼 필드
      credentials: {
        password: { label: "비밀번호", type: "password" }
      },
      
      // 인증 로직
      async authorize(credentials) {
        try {
          // credentials이 없거나 비밀번호가 없는 경우
          if (!credentials?.password) {
            return null;
          }

          // 비밀번호 검증
          const isValid = await validatePassword(credentials.password);
          
          if (isValid) {
            // 인증 성공시 사용자 객체 반환
            // NextAuth는 이 객체를 세션에 저장
            return {
              id: "admin", // 단일 사용자이므로 고정 ID
              name: "관리자",
            };
          }
          
          // 비밀번호가 유효하지 않으면 null 반환
          return null;
        } catch (error) {
          console.error("인증 오류:", error);
          return null;
        }
      }
    })
  ],
  
  // JWT 설정
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일 유지
  },
  
  // 페이지 커스터마이징
  pages: {
    signIn: "/", // 로그인 페이지를 메인 페이지로 설정
  },
  
  // 콜백 설정
  callbacks: {
    // JWT 토큰 생성 시 호출되는 콜백
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    
    // 세션 생성 시 호출되는 콜백
    session: async ({ session, token }) => {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
        };
      }
      return session;
    },
  },
  
  // 디버깅 (개발 환경에서만 활성화)
  debug: process.env.NODE_ENV === "development",
});

// API 라우트 핸들러 내보내기
export { handler as GET, handler as POST }; 