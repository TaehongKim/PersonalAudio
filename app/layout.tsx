import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YC_mp3_Web - 윤채의 MP3 다운로더",
  description: "유튜브 및 멜론 차트의 음악을 모바일 기기에서도 쉽게 다운로드/관리할 수 있는 웹 기반 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
