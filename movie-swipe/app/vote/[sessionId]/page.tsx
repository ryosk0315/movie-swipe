"use client";

// 投票セッション画面
// - セッションIDに基づいて映画を表示
// - 各自が「いいね」を押す
// - 投票結果を集計して表示

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Movie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
};

type Vote = {
  movieId: number;
  userId: string;
  timestamp: number;
};

export default function VoteSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState<number>(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userId] = useState<string>(() => {
    // ユーザーIDを生成（localStorageから取得 or 新規作成）
    const stored = localStorage.getItem(`vote_userId_${sessionId}`);
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem(`vote_userId_${sessionId}`, newId);
    return newId;
  });
  const [showResults, setShowResults] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // セッションの映画リストを取得
  useEffect(() => {
    const loadSessionMovies = () => {
      const stored = localStorage.getItem(`vote_session_${sessionId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setMovies(data.movies || []);
        setCurrentMovieIndex(data.currentIndex || 0);
      } else {
        // セッションが存在しない場合は、新しいセッションを作成
        fetchInitialMovies();
      }
    };

    loadSessionMovies();
  }, [sessionId]);

  // 投票を読み込む
  useEffect(() => {
    const loadVotes = () => {
      const stored = localStorage.getItem(`vote_votes_${sessionId}`);
      if (stored) {
        setVotes(JSON.parse(stored));
      }
    };

    loadVotes();
    // 定期的に投票を更新（他のユーザーの投票を反映）
    const interval = setInterval(loadVotes, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // 初期映画を取得
  const fetchInitialMovies = async () => {
    setLoading(true);
    try {
      const moviePromises = Array.from({ length: 10 }, () =>
        fetch("/api/movies", { cache: "no-store" }).then((res) => res.json()),
      );
      const fetchedMovies = await Promise.all(moviePromises);
      setMovies(fetchedMovies);
      
      // セッションに保存
      localStorage.setItem(
        `vote_session_${sessionId}`,
        JSON.stringify({
          movies: fetchedMovies,
          currentIndex: 0,
        }),
      );
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    } finally {
      setLoading(false);
    }
  };

  // 「いいね」を押す
  const handleVote = (movieId: number) => {
    const newVote: Vote = {
      movieId,
      userId,
      timestamp: Date.now(),
    };

    // 既に投票済みかチェック
    const existingVote = votes.find(
      (v) => v.movieId === movieId && v.userId === userId,
    );
    if (existingVote) {
      // 投票を取り消す
      const updatedVotes = votes.filter(
        (v) => !(v.movieId === movieId && v.userId === userId),
      );
      setVotes(updatedVotes);
      localStorage.setItem(`vote_votes_${sessionId}`, JSON.stringify(updatedVotes));
    } else {
      // 投票を追加
      const updatedVotes = [...votes, newVote];
      setVotes(updatedVotes);
      localStorage.setItem(`vote_votes_${sessionId}`, JSON.stringify(updatedVotes));
    }
  };

  // 次の映画へ
  const nextMovie = () => {
    if (currentMovieIndex < movies.length - 1) {
      const newIndex = currentMovieIndex + 1;
      setCurrentMovieIndex(newIndex);
      localStorage.setItem(
        `vote_session_${sessionId}`,
        JSON.stringify({
          movies,
          currentIndex: newIndex,
        }),
      );
    }
  };

  // 前の映画へ
  const prevMovie = () => {
    if (currentMovieIndex > 0) {
      const newIndex = currentMovieIndex - 1;
      setCurrentMovieIndex(newIndex);
      localStorage.setItem(
        `vote_session_${sessionId}`,
        JSON.stringify({
          movies,
          currentIndex: newIndex,
        }),
      );
    }
  };

  // 投票結果を集計
  const getVoteCounts = () => {
    const counts: Record<number, number> = {};
    votes.forEach((vote) => {
      counts[vote.movieId] = (counts[vote.movieId] || 0) + 1;
    });
    return counts;
  };

  const voteCounts = getVoteCounts();
  const sortedMovies = [...movies].sort((a, b) => {
    const countA = voteCounts[a.id] || 0;
    const countB = voteCounts[b.id] || 0;
    return countB - countA;
  });

  const currentMovie = movies[currentMovieIndex];
  const currentVoteCount = currentMovie ? voteCounts[currentMovie.id] || 0 : 0;
  const hasVoted = currentMovie
    ? votes.some((v) => v.movieId === currentMovie.id && v.userId === userId)
    : false;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent mx-auto" />
          <p className="text-zinc-400">映画を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
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
              onClick={() => setShowResults(false)}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-4 sm:text-sm"
            >
              戻る
            </button>
          </header>

          <div className="mb-6 text-center">
            <h1 className="mb-3 text-3xl font-bold sm:text-4xl">投票結果</h1>
            <p className="text-zinc-400">セッションID: {sessionId}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedMovies.map((movie, index) => {
              const count = voteCounts[movie.id] || 0;
              return (
                <div
                  key={movie.id}
                  className={`rounded-xl border p-4 ${
                    index === 0 && count > 0
                      ? "border-red-600 bg-red-900/20 ring-2 ring-red-600"
                      : "border-zinc-800 bg-zinc-900/80"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-2xl font-bold text-red-600">
                      #{index + 1}
                    </span>
                    <span className="text-lg font-semibold text-white">
                      {count}票
                    </span>
                  </div>
                  {movie.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="mb-2 h-48 w-full rounded-lg object-cover"
                    />
                  )}
                  <h3 className="mb-1 text-lg font-semibold">{movie.title}</h3>
                  <p className="text-sm text-zinc-400">★ {movie.rating.toFixed(1)}</p>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (!currentMovie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="mb-4 text-lg text-zinc-400">映画がありません</p>
          <Link
            href="/vote"
            className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
          >
            新しいセッションを作成
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* ヘッダー */}
        <header className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between sm:left-10 sm:right-10 sm:top-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-7 w-7 rounded-sm bg-red-600 sm:h-8 sm:w-8" />
            <span className="text-lg font-semibold tracking-[0.25em] text-red-600 sm:text-xl">
              MOVIE SWIPE
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResults(true)}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-4 sm:text-sm"
            >
              📊 結果を見る
            </button>
            <Link
              href="/vote"
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-4 sm:text-sm"
            >
              戻る
            </Link>
          </div>
        </header>

        {/* セッションID表示 */}
        <div className="absolute left-4 right-4 top-20 z-20 text-center sm:top-24">
          <p className="text-xs text-zinc-400">セッションID: {sessionId}</p>
          <p className="mt-1 text-xs text-zinc-500">
            このIDを友達にシェアして、一緒に投票しよう！
          </p>
        </div>

        {/* 映画カード */}
        <div className="w-full max-w-md">
          <div className="relative h-[500px] w-full rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-2xl">
            {/* ポスター */}
            <div className="relative h-64 w-full overflow-hidden rounded-t-3xl">
              {currentMovie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
                  alt={currentMovie.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-400">
                  No Image
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
            </div>

            {/* 情報 */}
            <div className="p-6">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">{currentMovie.title}</h2>
                <span className="shrink-0 text-sm font-medium text-yellow-400">
                  ★ {currentMovie.rating.toFixed(1)}
                </span>
              </div>
              <p className="mb-4 line-clamp-3 text-sm text-zinc-400">
                {currentMovie.overview || "あらすじ情報はありません。"}
              </p>

              {/* 投票数表示 */}
              <div className="mb-4 text-center">
                <p className="text-lg font-semibold text-white">
                  {currentVoteCount}票
                </p>
                <p className="text-xs text-zinc-400">
                  {hasVoted ? "あなたも投票済み" : "投票してください"}
                </p>
              </div>

              {/* いいねボタン */}
              <button
                onClick={() => handleVote(currentMovie.id)}
                className={`w-full rounded-lg px-6 py-3 text-base font-medium text-white transition-colors ${
                  hasVoted
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                {hasVoted ? "❤️ いいねを取り消す" : "🤍 いいね"}
              </button>
            </div>
          </div>

          {/* ナビゲーション */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={prevMovie}
              disabled={currentMovieIndex === 0}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← 前へ
            </button>
            <span className="text-sm text-zinc-400">
              {currentMovieIndex + 1} / {movies.length}
            </span>
            <button
              onClick={nextMovie}
              disabled={currentMovieIndex === movies.length - 1}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
