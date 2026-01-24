"use client";

// 投票モード：セッション作成・参加画面
// - 新しい投票セッションを作成
// - 既存のセッションに参加

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VotePage() {
  const [sessionId, setSessionId] = useState<string>("");
  const router = useRouter();

  // 新しいセッションを作成
  const createSession = () => {
    const newSessionId = Math.random().toString(36).substring(2, 9);
    router.push(`/vote/${newSessionId}`);
  };

  // 既存のセッションに参加
  const joinSession = () => {
    if (sessionId.trim()) {
      router.push(`/vote/${sessionId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {/* ヘッダー */}
        <header className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between sm:left-10 sm:right-10 sm:top-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-7 w-7 rounded-sm bg-red-600 sm:h-8 sm:w-8" />
            <span className="text-lg font-semibold tracking-[0.25em] text-red-600 sm:text-xl">
              MOVIE SWIPE
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-4 sm:text-sm"
          >
            戻る
          </Link>
        </header>

        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h1 className="mb-3 text-3xl font-bold sm:text-4xl">投票モード</h1>
            <p className="text-zinc-400">
              みんなで映画を選ぼう！各自のスマホで同じ映画を見て、投票できます。
            </p>
          </div>

          <div className="space-y-4">
            {/* 新しいセッションを作成 */}
            <button
              onClick={createSession}
              className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-red-700"
            >
              🎬 新しい投票を始める
            </button>

            {/* 既存のセッションに参加 */}
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">セッションIDを入力して参加</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="セッションID"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      joinSession();
                    }
                  }}
                />
                <button
                  onClick={joinSession}
                  disabled={!sessionId.trim()}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  参加
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
