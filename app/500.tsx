import Link from "next/link";

export default function Error500() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white">
      <h1 className="text-6xl font-bold mb-4">500</h1>
      <p className="text-xl mb-8">서버 오류가 발생했습니다.</p>
      <Link href="/" className="text-blue-400 underline hover:text-blue-300">홈으로 돌아가기</Link>
    </div>
  );
} 