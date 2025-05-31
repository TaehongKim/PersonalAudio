import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextAuthProvider } from "@/contexts/NextAuthProvider";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ui/theme";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { SocketProvider } from "@/contexts/SocketProvider";
import { Player } from "@/components/Player";
import { DownloadProvider } from '@/contexts/DownloadContext'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "귀요미 윤채의 음악방",
  description: "유튜브 및 멜론 차트 음악 다운로더",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <CustomThemeProvider>
            <SocketProvider>
              <DownloadProvider>
                <PlayerProvider>
                  <NextAuthProvider>
                    {children}
                    <Player />
                    <ToastContainer
                      position="bottom-right"
                      autoClose={3000}
                      hideProgressBar={false}
                      newestOnTop
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="dark"
                    />
                  </NextAuthProvider>
                </PlayerProvider>
              </DownloadProvider>
            </SocketProvider>
          </CustomThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
