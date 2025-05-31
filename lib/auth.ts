import { compare, hash } from "bcrypt";
import { prisma } from "./prisma";
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const SALT_ROUNDS = 10;

/**
 * 비밀번호를 암호화합니다.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

/**
 * 제공된 비밀번호와 저장된 비밀번호를 비교합니다.
 */
export async function comparePassword(
  inputPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(inputPassword, hashedPassword);
}

/**
 * 데이터베이스에서 설정 정보를 가져옵니다.
 */
export async function getSettings() {
  // 설정이 없으면 새로 생성하고, 있으면 기존 설정을 반환
  let settings = await prisma.settings.findFirst();
  
  if (!settings) {
    // 기본 비밀번호: "1" (실제 배포시에는 강력한 비밀번호로 변경 필요)
    const defaultPassword = await hashPassword("1");
    
    settings = await prisma.settings.create({
      data: {
        password: defaultPassword,
        storageLimit: 1024 * 1024 * 1024, // 기본 1GB 저장 용량
        darkMode: false,
      },
    });
  }
  
  return settings;
}

/**
 * 비밀번호가 유효한지 확인합니다.
 */
export async function validatePassword(password: string): Promise<boolean> {
  const settings = await getSettings();
  return comparePassword(password, settings.password);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) return null
        
        // 여기서 실제 인증 로직을 구현
        if (credentials.username === process.env.ADMIN_USERNAME && 
            credentials.password === process.env.ADMIN_PASSWORD) {
          return {
            id: '1',
            name: credentials.username,
            email: `${credentials.username}@example.com`
          }
        }
        return null
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30일
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
} 