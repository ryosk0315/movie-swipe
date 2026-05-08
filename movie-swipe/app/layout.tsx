import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "コレミル — 20秒で今夜の1本が決まる",
  description:
    "映画を5回スワイプするだけで、今夜観る1本が20秒で決まる。迷わない、悩まない、コレ見る。",
  keywords: ["映画", "スワイプ", "おすすめ", "コレミル", "映画決断", "今夜何観る"],
  authors: [{ name: "コレミル" }],
  openGraph: {
    title: "コレミル — 20秒で今夜の1本が決まる",
    description:
      "5回スワイプするだけで今夜観る映画が決まる。迷わない映画決断マシン。",
    type: "website",
    locale: "ja_JP",
    siteName: "コレミル",
  },
  twitter: {
    card: "summary_large_image",
    title: "コレミル — 20秒で今夜の1本が決まる",
    description:
      "5回スワイプするだけで今夜観る映画が決まる。迷わない映画決断マシン。",
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
        <Analytics />
      </body>
    </html>
  );
}
