import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MOVIE SWIPE - スワイプで映画を探す",
  description: "映画をスワイプで探せるWebアプリ。右スワイプで選んで、左スワイプでスキップ。あなたにぴったりの映画を見つけよう。",
  keywords: ["映画", "スワイプ", "おすすめ", "Movie", "TMDb"],
  authors: [{ name: "MOVIE SWIPE" }],
  openGraph: {
    title: "MOVIE SWIPE - スワイプで映画を探す",
    description: "映画をスワイプで探せるWebアプリ。右スワイプで選んで、左スワイプでスキップ。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "MOVIE SWIPE - スワイプで映画を探す",
    description: "映画をスワイプで探せるWebアプリ。右スワイプで選んで、左スワイプでスキップ。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
