import { prisma } from './prisma';
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'admin1234';  // 기본 비밀번호
const SALT_ROUNDS = 10;                // bcrypt salt 라운드 수

/**
 * 관리자 계정 초기화 함수
 * 
 * 설정이 없는 경우 기본 비밀번호로 관리자 설정을 생성합니다.
 */
export async function initializeAdmin(password?: string) {
  try {
    // 기존 설정 확인
    const settingsCount = await prisma.settings.count();
    
    if (settingsCount === 0) {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password || DEFAULT_PASSWORD, SALT_ROUNDS);
      
      // 관리자 설정 생성
      await prisma.settings.create({
        data: {
          password: hashedPassword,
          storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
          darkMode: false
        }
      });
      
      console.log('관리자 계정이 생성되었습니다.');
      console.log(`기본 비밀번호: ${password || DEFAULT_PASSWORD}`);
      console.log('첫 로그인 후 꼭 비밀번호를 변경해주세요.');
    } else {
      console.log('관리자 계정이 이미 존재합니다.');
    }
  } catch (error) {
    console.error('관리자 계정 초기화 오류:', error);
    throw error;
  }
}

/**
 * 직접 실행될 경우 관리자 계정 초기화 수행
 */
if (require.main === module) {
  // 명령줄 인수에서 비밀번호 가져오기
  const customPassword = process.argv[2];
  
  initializeAdmin(customPassword)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('오류 발생:', error);
      process.exit(1);
    });
} 