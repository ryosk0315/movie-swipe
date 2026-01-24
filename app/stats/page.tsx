"use client";

// 履歴統計画面
// - スワイプした映画の統計を表示
// - 選んだ映画の統計を表示
// - グラフ・チャートで可視化

import { useEffect, useState } from "react";
import Link from "next/link";

type SwipeStat = {
  movieId: number;
  timestamp: number;
  direction: "left" | "right" | "down" | "up";
};

type SelectedMovie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
  selectedAt: number;
  action: "watch_now" | "watch_later";
  watched?: boolean;
};

type StatPeriod = "today" | "week" | "month" | "all";

type FavoriteMovie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
  addedAt: number;
};

export default function StatsPage() {
  const [swipeStats, setSwipeStats] = useState<SwipeStat[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<SelectedMovie[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<FavoriteMovie[]>([]);
  const [period, setPeriod] = useState<StatPeriod>("all");

  // localStorageからデータを取得
  useEffect(() => {
    const stats = localStorage.getItem("swipeStats");
    const selected = localStorage.getItem("selectedMovies");
    const favorites = localStorage.getItem("favoriteMovies");

    if (stats) {
      setSwipeStats(JSON.parse(stats));
    }
    if (selected) {
      setSelectedMovies(JSON.parse(selected));
    }
    if (favorites) {
      setFavoriteMovies(JSON.parse(favorites));
    }
  }, []);

  // 期間でフィルタリング
  const getFilteredStats = () => {
    const now = Date.now();
    let startTime = 0;

    switch (period) {
      case "today":
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
      default:
        return swipeStats;
    }

    return swipeStats.filter((stat) => stat.timestamp >= startTime);
  };

  const filteredStats = getFilteredStats();
  const filteredSelected = selectedMovies.filter((movie) => {
    const startTime =
      period === "today"
        ? Date.now() - 24 * 60 * 60 * 1000
        : period === "week"
          ? Date.now() - 7 * 24 * 60 * 60 * 1000
          : period === "month"
            ? Date.now() - 30 * 24 * 60 * 60 * 1000
            : 0;
    return movie.selectedAt >= startTime;
  });

  // 統計を計算
  const totalSwipes = filteredStats.length;
  const leftSwipes = filteredStats.filter((s) => s.direction === "left").length;
  const rightSwipes = filteredStats.filter((s) => s.direction === "right").length;
  const downSwipes = filteredStats.filter((s) => s.direction === "down").length;
  const totalSelected = filteredSelected.length;
  const watchNowCount = filteredSelected.filter((m) => m.action === "watch_now").length;
  const watchLaterCount = filteredSelected.filter((m) => m.action === "watch_later").length;

  // スワイプの傾向
  const swipeRatio = totalSwipes > 0 ? (rightSwipes / totalSwipes) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 min-h-screen px-4 py-8 sm:px-8">
        {/* ヘッダー */}
        <header className="mb-8 flex items-center justify-between">
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

        {/* タイトル */}
        <div className="mb-6 text-center">
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl">履歴統計</h1>
        </div>

        {/* 期間選択 */}
        <div className="mb-8 flex justify-center gap-2">
          {[
            { label: "今日", value: "today" as StatPeriod },
            { label: "今週", value: "week" as StatPeriod },
            { label: "今月", value: "month" as StatPeriod },
            { label: "全期間", value: "all" as StatPeriod },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                period === option.value
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* スワイプ総数 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">スワイプ総数</h3>
            <p className="text-3xl font-bold text-white">{totalSwipes}</p>
          </div>

          {/* 選んだ映画数 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">選んだ映画数</h3>
            <p className="text-3xl font-bold text-white">{totalSelected}</p>
          </div>

          {/* お気に入り数 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">お気に入り数</h3>
            <p className="text-3xl font-bold text-white">{favoriteMovies.length}</p>
            <Link
              href="/favorites"
              className="mt-2 block text-xs text-red-400 hover:text-red-300"
            >
              お気に入りを見る →
            </Link>
          </div>

          {/* スワイプの傾向 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">選ぶ割合</h3>
            <p className="text-3xl font-bold text-white">{swipeRatio.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-zinc-500">
              {rightSwipes}回選んだ / {totalSwipes}回スワイプ
            </p>
          </div>

          {/* スキップ数 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">スキップ数</h3>
            <p className="text-3xl font-bold text-white">{leftSwipes}</p>
          </div>

          {/* 今すぐ見る */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">今すぐ見る</h3>
            <p className="text-3xl font-bold text-white">{watchNowCount}</p>
          </div>

          {/* 後で見る */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-2 text-sm font-semibold text-zinc-400">後で見る</h3>
            <p className="text-3xl font-bold text-white">{watchLaterCount}</p>
          </div>
        </div>

        {/* スワイプ方向のグラフ */}
        {totalSwipes > 0 && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">スワイプ方向の内訳</h3>
            <div className="space-y-3">
              {/* 右スワイプ（選ぶ） */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">選んだ</span>
                  <span className="text-zinc-400">
                    {rightSwipes}回 ({totalSwipes > 0 ? ((rightSwipes / totalSwipes) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-red-600 transition-all"
                    style={{ width: `${totalSwipes > 0 ? (rightSwipes / totalSwipes) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 左スワイプ（スキップ） */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">スキップ</span>
                  <span className="text-zinc-400">
                    {leftSwipes}回 ({totalSwipes > 0 ? ((leftSwipes / totalSwipes) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-zinc-600 transition-all"
                    style={{ width: `${totalSwipes > 0 ? (leftSwipes / totalSwipes) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* 下スワイプ（見たことある） */}
              {downSwipes > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-300">見たことある</span>
                    <span className="text-zinc-400">
                      {downSwipes}回 ({totalSwipes > 0 ? ((downSwipes / totalSwipes) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-yellow-600 transition-all"
                      style={{ width: `${totalSwipes > 0 ? (downSwipes / totalSwipes) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* データがない場合 */}
        {totalSwipes === 0 && (
          <div className="mt-12 text-center">
            <p className="text-lg text-zinc-400">まだ統計データがありません</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
            >
              映画を探す
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
