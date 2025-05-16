import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 인증 없이 접근 가능한 경로
const publicPaths = ["/", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 공개 경로는 인증 검사 없이 통과
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // 공유 링크 경로는 별도 처리
  if (pathname.startsWith("/share/")) {
    return NextResponse.next();
  }
  
  // JWT 토큰 확인
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // 토큰이 없으면 로그인 페이지로 리디렉션
  if (!token) {
    const loginUrl = new URL("/", request.url);
    // 원래 목적지 URL을 쿼리 파라미터로 저장
    loginUrl.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

// 미들웨어가 적용될 경로 지정
export const config = {
  matcher: [
    // 다음 경로는 제외
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}; 