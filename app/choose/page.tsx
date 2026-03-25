"use client";

// 選択タイム画面
// - 「見たい」が2本以上：2択トーナメントで1本に
// - 1本：そのまま確定モーダルへ
// - 0本：今ラウンドで見た5本からランダム強制

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { isMobile } from "../utils/deviceDetection";
import { getProviderWatchUrl } from "../utils/providerUrls";

type CandidateMovie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
  addedAt: number;
};

type SelectedMovie = CandidateMovie & {
  selectedAt: number;
  action: "watch_now" | "watch_later";
  watched?: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ChoosePage() {
  const [candidates, setCandidates] = useState<CandidateMovie[]>([]);
  /** トーナメント残り（先頭2枚が現在の対戦カード） */
  const [tournamentPool, setTournamentPool] = useState<CandidateMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<CandidateMovie | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [providers, setProviders] = useState<any>(null);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);
  const [phase, setPhase] = useState<"loading" | "tournament" | "empty">("loading");

  useEffect(() => {
    const stored = localStorage.getItem("candidates");
    const poolRaw = localStorage.getItem("swipeSessionMovies");
    const list: CandidateMovie[] = stored ? JSON.parse(stored) : [];
    const pool: CandidateMovie[] = poolRaw
      ? JSON.parse(poolRaw).map((m: CandidateMovie) => ({
          ...m,
          addedAt: m.addedAt ?? Date.now(),
        }))
      : [];

    setCandidates(list);

    if (list.length >= 2) {
      setTournamentPool(shuffle(list));
      setPhase("tournament");
    } else if (list.length === 1) {
      setSelectedMovie(list[0]);
      setShowModal(true);
      setPhase("tournament");
    } else if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSelectedMovie(pick);
      setShowModal(true);
      setPhase("tournament");
    } else {
      setPhase("empty");
    }
  }, []);

  const pickWinner = useCallback((winner: CandidateMovie) => {
    setTournamentPool((prev) => {
      if (prev.length < 2) return prev;
      const rest = prev.slice(2);
      const next = [winner, ...rest];
      if (next.length === 1) {
        queueMicrotask(() => {
          setSelectedMovie(next[0]);
          setShowModal(true);
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (showModal && selectedMovie) {
      setProviders(null);
      fetchProviders(selectedMovie.id);
    }
  }, [showModal, selectedMovie?.id]);

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

  const handleWatchNow = () => {
    if (selectedMovie) {
      saveSelectedMovie(selectedMovie, "watch_now");
      localStorage.removeItem("candidates");
      localStorage.removeItem("swipeSessionMovies");
      window.location.href = "/";
    }
  };

  const handleWatchLater = () => {
    if (selectedMovie) {
      saveSelectedMovie(selectedMovie, "watch_later");
      localStorage.removeItem("candidates");
      localStorage.removeItem("swipeSessionMovies");
      window.location.href = "/";
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedMovie(null);
  };

  const handleReset = () => {
    localStorage.removeItem("candidates");
    localStorage.removeItem("swipeSessionMovies");
    window.location.href = "/";
  };

  const left = tournamentPool[0];
  const right = tournamentPool[1];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 min-h-screen px-4 py-8 sm:px-8">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-7 w-7 rounded-sm bg-red-600 sm:h-8 sm:w-8" />
            <span className="text-lg font-semibold tracking-[0.25em] text-red-600 sm:text-xl">
              MOVIE SWIPE
            </span>
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-4 sm:text-sm"
          >
            最初から
          </button>
        </header>

        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl">選択タイム</h1>
          <p className="text-zinc-400">
            {phase === "empty"
              ? "データがありません"
              : candidates.length >= 2
                ? "どちらか気になる方をタップ（トーナメント）"
                : candidates.length === 1
                  ? "今日の1本を確定しましょう"
                  : "見たいが0本のため、このラウンドで見た映画からランダムで1本選びました"}
          </p>
        </div>

        {phase === "loading" && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
          </div>
        )}

        {phase === "empty" && (
          <div className="flex flex-col items-center gap-6 py-12">
            <p className="text-lg text-zinc-400">まだ映画を選んでいません。</p>
            <Link
              href="/"
              className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
            >
              映画を探す
            </Link>
          </div>
        )}

        {phase === "tournament" && candidates.length >= 2 && left && right && (
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-center text-sm text-zinc-500">
              残り {tournamentPool.length} 本 — 最後の1本になるまで続けます
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pickWinner(left)}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 text-left transition-all hover:border-red-600/60 hover:ring-2 hover:ring-red-600/40"
              >
                <div className="relative h-64 w-full overflow-hidden sm:h-72">
                  {left.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${left.poster_path}`}
                      alt={left.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-400">
                      No Image
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-12">
                    <p className="line-clamp-2 text-base font-semibold">{left.title}</p>
                  </div>
                </div>
                <div className="px-3 py-3">
                  <span className="text-sm font-medium text-red-400">これが気になる</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => pickWinner(right)}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 text-left transition-all hover:border-red-600/60 hover:ring-2 hover:ring-red-600/40"
              >
                <div className="relative h-64 w-full overflow-hidden sm:h-72">
                  {right.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${right.poster_path}`}
                      alt={right.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-400">
                      No Image
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-12">
                    <p className="line-clamp-2 text-base font-semibold">{right.title}</p>
                  </div>
                </div>
                <div className="px-3 py-3">
                  <span className="text-sm font-medium text-red-400">これが気になる</span>
                </div>
              </button>
            </div>
          </div>
        )}

      </main>

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
              {loadingProviders ? (
                <p className="text-sm text-zinc-400">配信サービスを確認中…</p>
              ) : null}
            </div>

            {loadingProviders ? (
              <div className="mb-4 flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
              </div>
            ) : providers?.flatrate?.length ? (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold text-zinc-300">今すぐ見る（配信サービスへ）</p>
                <div className="flex flex-wrap gap-2">
                  {providers.flatrate.map(
                    (provider: {
                      id?: number;
                      provider_id?: number;
                      name?: string;
                      provider_name?: string;
                      logo_path?: string;
                    }) => {
                      const pid = provider.id ?? provider.provider_id ?? 0;
                      const name = provider.name ?? provider.provider_name ?? "";
                      const watchUrl = getProviderWatchUrl(pid, providers.link ?? null, isMobile());
                      return (
                        <a
                          key={pid}
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            saveSelectedMovie(selectedMovie, "watch_now");
                            localStorage.removeItem("candidates");
                            localStorage.removeItem("swipeSessionMovies");
                          }}
                          className="flex items-center gap-2 rounded-lg bg-red-600/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
                        >
                          {provider.logo_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                              alt={name}
                              className="h-6 w-6 rounded"
                            />
                          )}
                          <span>{name}で見る</span>
                        </a>
                      );
                    },
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-amber-600/50 bg-amber-950/30 px-4 py-3">
                <p className="text-sm font-medium text-amber-200">
                  この映画は現在配信がありません
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  それでもリストに追加するか、選ばないで閉じることができます。
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {!loadingProviders && !providers?.flatrate?.length && (
                <button
                  type="button"
                  onClick={handleWatchNow}
                  className="rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-red-500"
                >
                  今すぐ見るに追加
                </button>
              )}
              <button
                type="button"
                onClick={handleWatchLater}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-base font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-700"
              >
                後で見るに追加
              </button>
              <button
                type="button"
                onClick={handleModalClose}
                className="rounded-lg border border-zinc-600 px-6 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                選ばない（閉じる）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
