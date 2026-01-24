"use client";

// 選択タイム画面
// - 「見たい山」から最終的に1本選ぶ
// - ランダム選択または手動選択

import { useEffect, useState } from "react";
import Link from "next/link";

// 「見たい山」の映画型
type CandidateMovie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
  addedAt: number;
};

// 選んだ映画の型
type SelectedMovie = CandidateMovie & {
  selectedAt: number;
  action: "watch_now" | "watch_later";
  watched?: boolean;
};

export default function ChoosePage() {
  const [candidates, setCandidates] = useState<CandidateMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<CandidateMovie | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isRandomSelecting, setIsRandomSelecting] = useState<boolean>(false);
  const [providers, setProviders] = useState<any>(null);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);

  // localStorageから「見たい山」を取得
  useEffect(() => {
    const stored = localStorage.getItem("candidates");
    if (stored) {
      const list: CandidateMovie[] = JSON.parse(stored);
      setCandidates(list);
    }
  }, []);

  // ランダムで1本選ぶ
  const handleRandomSelect = () => {
    if (candidates.length === 0) return;

    setIsRandomSelecting(true);

    // ルーレット演出（0.5秒間）
    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      setSelectedMovie(candidates[randomIndex]);
      count++;

      if (count >= 10) {
        clearInterval(interval);
        setIsRandomSelecting(false);
        setShowModal(true);
      }
    }, 50);
  };

  // 手動で1本選ぶ
  const handleManualSelect = (movie: CandidateMovie) => {
    setSelectedMovie(movie);
    setShowModal(true);
  };

  // 選んだ映画をlocalStorageに保存
  const saveSelectedMovie = (
    movie: CandidateMovie,
    action: "watch_now" | "watch_later",
  ) => {
    const selected: SelectedMovie = {
      ...movie,
      selectedAt: Date.now(),
      action,
      watched: false,
    };

    const existing = localStorage.getItem("selectedMovies");
    const list: SelectedMovie[] = existing ? JSON.parse(existing) : [];

    if (!list.some((m) => m.id === movie.id)) {
      list.unshift(selected);
      localStorage.setItem("selectedMovies", JSON.stringify(list));
    }
  };

  // 配信サービス情報を取得
  const fetchProviders = async (movieId: number) => {
    setLoadingProviders(true);
    try {
      const res = await fetch(`/api/movies/${movieId}/providers`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoadingProviders(false);
    }
  };

  // 「今すぐ見る」を選択
  const handleWatchNow = async () => {
    if (selectedMovie) {
      // 配信サービス情報を取得
      await fetchProviders(selectedMovie.id);
      // 配信サービスがある場合は、そのまま表示（モーダルは開いたまま）
      // 配信サービスがない場合は、保存してメイン画面に戻る
      if (!providers || (!providers.flatrate || providers.flatrate.length === 0)) {
        saveSelectedMovie(selectedMovie, "watch_now");
        localStorage.removeItem("candidates");
        window.location.href = "/";
      }
    }
  };

  // 「後で見る」を選択
  const handleWatchLater = () => {
    if (selectedMovie) {
      saveSelectedMovie(selectedMovie, "watch_later");
      // 「見たい山」をクリア
      localStorage.removeItem("candidates");
      // メイン画面に戻る
      window.location.href = "/";
    }
  };

  // モーダルを閉じる
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedMovie(null);
  };

  // やり直す（メイン画面に戻る）
  const handleReset = () => {
    // 「見たい山」をクリア
    localStorage.removeItem("candidates");
    window.location.href = "/";
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
            最初から
          </Link>
        </header>

        {/* タイトル */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl">選択タイム</h1>
          <p className="text-zinc-400">
            {candidates.length > 0
              ? `${candidates.length}本の中から、今日見る映画を選びましょう！`
              : "選んだ映画がありません"}
          </p>
        </div>

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-6 py-12">
            <p className="text-lg text-zinc-400">
              まだ映画を選んでいません。
            </p>
            <Link
              href="/"
              className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
            >
              映画を探す
            </Link>
          </div>
        ) : (
          <>
            {/* ランダム選択ボタン */}
            <div className="mb-8 flex justify-center gap-4">
              <button
                type="button"
                onClick={handleRandomSelect}
                disabled={isRandomSelecting}
                className="rounded-lg bg-red-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isRandomSelecting ? "選択中..." : "🎲 ランダムで選ぶ"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-6 py-3 text-base font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
              >
                やり直す
              </button>
            </div>

            {/* 映画一覧 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map((movie) => (
                <div
                  key={movie.id}
                  className={`group relative overflow-hidden rounded-xl border transition-all ${
                    selectedMovie?.id === movie.id && isRandomSelecting
                      ? "border-red-600 bg-red-900/20 ring-2 ring-red-600"
                      : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
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
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                  </div>

                  {/* 情報 */}
                  <div className="p-4">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="line-clamp-2 text-base font-semibold">
                        {movie.title}
                      </h3>
                      <span className="shrink-0 text-sm font-medium text-yellow-400">
                        ★ {movie.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="mb-4 line-clamp-2 text-xs text-zinc-400">
                      {movie.overview || "あらすじ情報はありません。"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleManualSelect(movie)}
                      className="w-full rounded-lg bg-zinc-800 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                    >
                      これを選ぶ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 選択確認モーダル */}
      {showModal && selectedMovie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={handleModalClose}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleModalClose}
              className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-white"
            >
              ✕
            </button>

            <div className="mb-4 text-center">
              <h3 className="mb-2 text-xl font-semibold">
                {selectedMovie.title} を選びました
              </h3>
              <p className="text-sm text-zinc-400">どうしますか？</p>
            </div>

            {/* 配信サービスリンク */}
            {loadingProviders ? (
              <div className="mb-4 flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
              </div>
            ) : providers && providers.flatrate && providers.flatrate.length > 0 ? (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold text-zinc-300">配信サービス</p>
                <div className="flex flex-wrap gap-2">
                  {providers.flatrate.map((provider: any) => (
                    <a
                      key={provider.provider_id}
                      href={providers.link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        saveSelectedMovie(selectedMovie, "watch_now");
                        localStorage.removeItem("candidates");
                      }}
                      className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-700"
                    >
                      {provider.logo_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                          alt={provider.provider_name}
                          className="h-6 w-6 rounded"
                        />
                      )}
                      <span>{provider.provider_name}で見る</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {(!providers || !providers.flatrate || providers.flatrate.length === 0) && (
                <button
                  type="button"
                  onClick={handleWatchNow}
                  className="rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-red-500"
                >
                  今すぐ見る
                </button>
              )}
              <button
                type="button"
                onClick={handleWatchLater}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-base font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-700"
              >
                後で見る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
