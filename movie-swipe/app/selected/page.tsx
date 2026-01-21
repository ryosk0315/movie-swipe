"use client";

// 選んだ映画のリスト画面
// - localStorageから選んだ映画を表示
// - 「今すぐ見る」と「後で見る」を分けて表示
// - 配信サービスへのリンクを表示
// - シェア機能

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// 選んだ映画の型
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

// 配信サービス情報の型
type Provider = {
  id: number;
  name: string;
  logo_path: string | null;
};

type WatchProviders = {
  link: string | null;
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
};

export default function SelectedPage() {
  const [selectedMovies, setSelectedMovies] = useState<SelectedMovie[]>([]);
  const [filter, setFilter] = useState<"all" | "watch_now" | "watch_later">(
    "all",
  );
  const [providersMap, setProvidersMap] = useState<
    Record<number, WatchProviders | null>
  >({});
  const [loadingProviders, setLoadingProviders] = useState<Set<number>>(
    new Set(),
  );

  // localStorageから選んだ映画を読み込む
  useEffect(() => {
    const loadSelectedMovies = () => {
      const stored = localStorage.getItem("selectedMovies");
      if (stored) {
        try {
          const list: SelectedMovie[] = JSON.parse(stored);
          setSelectedMovies(list);
        } catch (e) {
          console.error("Failed to parse selectedMovies:", e);
        }
      }
    };

    loadSelectedMovies();
    // 他のタブからの更新を検知
    window.addEventListener("storage", loadSelectedMovies);
    return () => window.removeEventListener("storage", loadSelectedMovies);
  }, []);

  // フィルタリング
  const filteredMovies =
    filter === "all"
      ? selectedMovies
      : selectedMovies.filter((m) => m.action === filter);

  // 映画を削除
  const removeMovie = (id: number) => {
    const updated = selectedMovies.filter((m) => m.id !== id);
    setSelectedMovies(updated);
    localStorage.setItem("selectedMovies", JSON.stringify(updated));
  };

  // 「見た」をマーク
  const markAsWatched = (id: number) => {
    const updated = selectedMovies.map((m) =>
      m.id === id ? { ...m, watched: true } : m,
    );
    setSelectedMovies(updated);
    localStorage.setItem("selectedMovies", JSON.stringify(updated));
  };

  // 配信サービス情報を取得
  const fetchProviders = useCallback(
    async (movieId: number) => {
      if (
        providersMap[movieId] !== undefined ||
        loadingProviders.has(movieId)
      ) {
        return; // 既に取得済み or 取得中
      }

      setLoadingProviders((prev) => new Set(prev).add(movieId));

      try {
        const res = await fetch(`/api/movies/${movieId}/providers`);
        if (res.ok) {
          const data = (await res.json()) as WatchProviders;
          setProvidersMap((prev) => ({ ...prev, [movieId]: data }));
        } else {
          setProvidersMap((prev) => ({ ...prev, [movieId]: null }));
        }
      } catch (error) {
        console.error("Failed to fetch providers:", error);
        setProvidersMap((prev) => ({ ...prev, [movieId]: null }));
      } finally {
        setLoadingProviders((prev) => {
          const next = new Set(prev);
          next.delete(movieId);
          return next;
        });
      }
    },
    [providersMap, loadingProviders],
  );

  // 映画カードが表示されたら配信サービス情報を取得
  useEffect(() => {
    filteredMovies.forEach((movie) => {
      if (providersMap[movie.id] === undefined) {
        fetchProviders(movie.id);
      }
    });
  }, [filteredMovies, providersMap, fetchProviders]);

  // シェア機能
  const shareMovie = async (movie: SelectedMovie) => {
    const text = `${movie.title} を見よう！\n評価: ★${movie.rating.toFixed(1)}\n\n`;
    const url = window.location.origin;

    if (navigator.share) {
      // Web Share APIが使える場合（モバイル）
      try {
        await navigator.share({
          title: movie.title,
          text,
          url,
        });
      } catch (error) {
        // ユーザーがキャンセルした場合など
        console.log("Share cancelled");
      }
    } else {
      // フォールバック: クリップボードにコピー
      try {
        await navigator.clipboard.writeText(`${text}${url}`);
        alert("クリップボードにコピーしました！");
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  // 配信サービスリンクをクリックしたら「見た」をマーク
  const handleProviderClick = (movieId: number) => {
    const movie = selectedMovies.find((m) => m.id === movieId);
    if (movie && !movie.watched) {
      markAsWatched(movieId);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 背景のグラデーション */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 min-h-screen px-4 py-8 sm:px-8">
        {/* ヘッダー */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-red-600 transition-colors hover:text-red-500"
            >
              <div className="h-7 w-7 rounded-sm bg-red-600 sm:h-8 sm:w-8" />
              <span className="text-lg font-semibold tracking-[0.25em] sm:text-xl">
                MOVIE SWIPE
              </span>
            </Link>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            戻る
          </Link>
        </header>

        {/* タイトルとフィルター */}
        <div className="mb-6">
          <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">
            選んだ映画
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                filter === "all"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700"
              }`}
            >
              すべて
            </button>
            <button
              type="button"
              onClick={() => setFilter("watch_now")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                filter === "watch_now"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700"
              }`}
            >
              今すぐ見る
            </button>
            <button
              type="button"
              onClick={() => setFilter("watch_later")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                filter === "watch_later"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700"
              }`}
            >
              後で見る
            </button>
          </div>
        </div>

        {/* 映画リスト */}
        {filteredMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-2 text-lg text-zinc-400">
              {filter === "all"
                ? "まだ映画を選んでいません"
                : filter === "watch_now"
                  ? "「今すぐ見る」に選んだ映画はありません"
                  : "「後で見る」に選んだ映画はありません"}
            </p>
            <Link
              href="/"
              className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              映画を探す
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className={`group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 transition-all hover:border-zinc-700 ${
                  movie.watched ? "opacity-60" : ""
                }`}
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
                  {/* 見たマーク */}
                  {movie.watched && (
                    <div className="absolute right-2 top-2 rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
                      見た
                    </div>
                  )}
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
                  <p className="mb-3 line-clamp-2 text-xs text-zinc-400">
                    {movie.overview}
                  </p>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                        movie.action === "watch_now"
                          ? "bg-red-600/20 text-red-400"
                          : "bg-blue-600/20 text-blue-400"
                      }`}
                    >
                      {movie.action === "watch_now" ? "今すぐ見る" : "後で見る"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(movie.selectedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>

                  {/* 配信サービス情報 */}
                  {providersMap[movie.id] !== undefined && (
                    <div className="mb-3">
                      {loadingProviders.has(movie.id) ? (
                        <p className="text-xs text-zinc-500">読み込み中...</p>
                      ) : providersMap[movie.id] ? (
                        <div className="space-y-2">
                          {providersMap[movie.id]!.flatrate.length > 0 && (
                            <div>
                              <p className="mb-1 text-[10px] font-medium text-zinc-400">
                                配信サービス:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {providersMap[movie.id]!.flatrate.map(
                                  (provider) => (
                                    <a
                                      key={provider.id}
                                      href={
                                        providersMap[movie.id]!.link || "#"
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() =>
                                        handleProviderClick(movie.id)
                                      }
                                      className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
                                    >
                                      {provider.logo_path ? (
                                        <img
                                          src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                                          alt={provider.name}
                                          className="h-3 w-3 object-contain"
                                        />
                                      ) : null}
                                      <span>{provider.name}</span>
                                    </a>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                          {providersMap[movie.id]!.flatrate.length === 0 &&
                            providersMap[movie.id]!.rent.length === 0 &&
                            providersMap[movie.id]!.buy.length === 0 && (
                              <p className="text-[10px] text-zinc-500">
                                配信情報がありません
                              </p>
                            )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-500">
                          配信情報の取得に失敗しました
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!movie.watched && (
                      <button
                        type="button"
                        onClick={() => markAsWatched(movie.id)}
                        className="flex-1 rounded-lg bg-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 transition-colors hover:bg-green-600/30"
                      >
                        見た
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => shareMovie(movie)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                    >
                      シェア
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMovie(movie.id)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* フッター */}
        <footer className="mt-12 text-center text-[11px] text-zinc-500 sm:text-xs">
          This product uses the TMDb API but is not endorsed or certified by
          TMDb
        </footer>
      </main>
    </div>
  );
}
