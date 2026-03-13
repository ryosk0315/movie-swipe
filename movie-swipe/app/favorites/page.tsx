"use client";

// お気に入り一覧画面
// - localStorageからお気に入りの映画を表示
// - 履歴統計と連携してリコメンド

import { useEffect, useState } from "react";
import Link from "next/link";
import DataBackupModal from "../components/DataBackupModal";

type FavoriteMovie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
  addedAt: number;
};

type SwipeStat = {
  movieId: number;
  timestamp: number;
  direction: "left" | "right" | "down" | "up";
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [recommendations, setRecommendations] = useState<number[]>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // localStorageからお気に入りを読み込む
  useEffect(() => {
    const loadFavorites = () => {
      const stored = localStorage.getItem("favoriteMovies");
      if (stored) {
        try {
          const list: FavoriteMovie[] = JSON.parse(stored);
          setFavorites(list);
        } catch (e) {
          console.error("Failed to parse favoriteMovies:", e);
        }
      }
    };

    loadFavorites();
    window.addEventListener("storage", loadFavorites);
    return () => window.removeEventListener("storage", loadFavorites);
  }, []);

  // 履歴統計からリコメンドを生成
  useEffect(() => {
    const generateRecommendations = () => {
      // お気に入りの映画IDを取得
      const favoriteIds = favorites.map((f) => f.id);
      if (favoriteIds.length === 0) return;

      // 統計データから、お気に入りの映画と似た傾向の映画を探す
      // （今回はシンプルに、お気に入りの映画と同じジャンルを選ぶ傾向がある映画をリコメンド）
      // 実際の実装では、TMDb APIの「似た映画」機能を使うと良い
      const stats = localStorage.getItem("swipeStats");
      if (stats) {
        const swipeStats: SwipeStat[] = JSON.parse(stats);
        // お気に入りの映画を選んだ回数が多い映画をリコメンド
        const movieCounts: Record<number, number> = {};
        swipeStats.forEach((stat) => {
          if (stat.direction === "right" || stat.direction === "up") {
            movieCounts[stat.movieId] = (movieCounts[stat.movieId] || 0) + 1;
          }
        });

        // お気に入り以外で、選んだ回数が多い映画をリコメンド
        const recommended = Object.entries(movieCounts)
          .filter(([id]) => !favoriteIds.includes(Number(id)))
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id]) => Number(id));

        setRecommendations(recommended);
      }
    };

    generateRecommendations();
  }, [favorites]);

  // お気に入りから削除
  const removeFavorite = (id: number) => {
    const updated = favorites.filter((f) => f.id !== id);
    setFavorites(updated);
    localStorage.setItem("favoriteMovies", JSON.stringify(updated));
  };

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
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl">お気に入り</h1>
          <p className="mb-2 text-zinc-400">
            {favorites.length > 0
              ? `${favorites.length}本のお気に入り映画`
              : "まだお気に入りがありません"}
          </p>
          <button
            type="button"
            onClick={() => setShowBackupModal(true)}
            className="text-sm text-zinc-400 underline underline-offset-2 hover:text-zinc-300"
          >
            データのバックアップ
          </button>
        </div>

        <DataBackupModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          onImportComplete={() => {
            const stored = localStorage.getItem("favoriteMovies");
            if (stored) setFavorites(JSON.parse(stored));
          }}
        />

        {/* リコメンド */}
        {recommendations.length > 0 && (
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h2 className="mb-3 text-lg font-semibold text-white">
              💡 あなたの好みに合いそうな映画
            </h2>
            <p className="text-sm text-zinc-400">
              お気に入りの映画から分析した、おすすめの映画ID:{" "}
              {recommendations.join(", ")}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              （今後、実際の映画情報を表示する機能を追加予定）
            </p>
          </div>
        )}

        {/* お気に入りリスト */}
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-2 text-lg text-zinc-400">
              まだお気に入りがありません
            </p>
            <p className="mb-4 text-sm text-zinc-500">
              メイン画面で上スワイプすると、お気に入りに追加できます
            </p>
            <Link
              href="/"
              className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
            >
              映画を探す
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((movie) => (
              <div
                key={movie.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 transition-all hover:border-zinc-700"
              >
                {/* ポスター */}
                <div className="relative h-64 w-full overflow-hidden">
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-400">
                      No Image
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                </div>

                {/* 情報 */}
                <div className="p-4">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h3 className="line-clamp-2 text-lg font-semibold">
                      {movie.title}
                    </h3>
                    <span className="shrink-0 text-sm font-medium text-yellow-400">
                      ★ {movie.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mb-4 line-clamp-2 text-xs text-zinc-400">
                    {movie.overview}
                  </p>

                  {/* ボタン */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeFavorite(movie.id)}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
                    >
                      削除
                    </button>
                    <Link
                      href={`/api/movies/${movie.id}/details`}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-red-700"
                    >
                      詳細
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
