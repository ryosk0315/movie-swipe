"use client";

// 映画スワイプ画面
// - /api/movies から映画を1件取得
// - カードをドラッグ＆スワイプして次の映画へ
// - 右スワイプで「選ぶ」、左スワイプで「スキップ」
// - Netflix風の黒背景デザイン

import { useCallback, useEffect, useState } from "react";

// APIから返ってくる映画データの型
type Movie = {
  id: number;
  title: string;
  rating: number;
  poster_path: string | null;
  overview: string;
};

// 選んだ映画の型（localStorageに保存する用）
type SelectedMovie = Movie & {
  selectedAt: number; // タイムスタンプ
  action: "watch_now" | "watch_later"; // 今すぐ見る or 後で見る
  watched?: boolean; // 実際に見たかどうか
};

// スワイプ判定に使うしきい値（px）
const SWIPE_THRESHOLD = 100;

export default function Home() {
  // 現在表示している映画
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // カードのドラッグ状態
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number>(0);

  // 選んだ映画を表示するモーダルの状態
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // スワイプで次の映画を読み込む処理
  const fetchMovie = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/movies", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "映画の取得に失敗しました。");
      }

      const data = (await res.json()) as Movie;
      setMovie(data);
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "予期しないエラーが発生しました。";
      setError(message);
    } finally {
      setLoading(false);
      // 次のカードに備えて位置をリセット
      setStartX(null);
      setCurrentX(0);
      setIsDragging(false);
    }
  }, []);

  // 初回マウント時に映画を取得
  useEffect(() => {
    fetchMovie();
  }, [fetchMovie]);

  // カードの回転角（Xの移動量に応じて少し傾ける）
  const rotation = (currentX / 10) * 1.5; // ほどよい傾きに調整

  // ドラッグ開始（マウス）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
  };

  // ドラッグ中（マウス）
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || startX === null) return;
    const deltaX = e.clientX - startX;
    setCurrentX(deltaX);
  };

  // ドラッグ終了（マウス）
  const handleMouseUp = () => {
    if (!isDragging) return;
    finishSwipe();
  };

  // 画面外でマウスを離したときのためにleaveも同様に扱う
  const handleMouseLeave = () => {
    if (!isDragging) return;
    finishSwipe();
  };

  // タッチ開始
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setStartX(touch.clientX);
  };

  // タッチ移動
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || startX === null) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    setCurrentX(deltaX);
  };

  // タッチ終了
  const handleTouchEnd = () => {
    if (!isDragging) return;
    finishSwipe();
  };

  // 選んだ映画をlocalStorageに保存する関数
  const saveSelectedMovie = useCallback(
    (movie: Movie, action: "watch_now" | "watch_later") => {
      const selected: SelectedMovie = {
        ...movie,
        selectedAt: Date.now(),
        action,
        watched: false,
      };

      // localStorageから既存のリストを取得
      const existing = localStorage.getItem("selectedMovies");
      const list: SelectedMovie[] = existing
        ? JSON.parse(existing)
        : [];

      // 新しい映画を追加（重複チェック：同じIDがなければ追加）
      if (!list.some((m) => m.id === movie.id)) {
        list.unshift(selected); // 最新を先頭に
        localStorage.setItem("selectedMovies", JSON.stringify(list));
      }
    },
    [],
  );

  // スワイプの最終判定処理
  const finishSwipe = () => {
    const distance = currentX;

    // 規定値以上スワイプしていたら処理
    if (Math.abs(distance) >= SWIPE_THRESHOLD) {
      if (distance > 0 && movie) {
        // 右スワイプ = 選ぶ → カードを右に飛ばしてからモーダルを表示
        setIsDragging(false);
        // カードを画面外に飛ばすアニメーション
        setCurrentX(window.innerWidth);
        setTimeout(() => {
          setSelectedMovie(movie);
          setShowModal(true);
          // 位置をリセット
          setStartX(null);
          setCurrentX(0);
        }, 250); // アニメーション時間に合わせる
      } else {
        // 左スワイプ = スキップ → カードを左に飛ばしてから次の映画へ
        setIsDragging(false);
        // カードを画面外に飛ばすアニメーション
        setCurrentX(-window.innerWidth);
        setTimeout(() => {
          fetchMovie();
        }, 250); // アニメーション時間に合わせる
      }
    } else {
      // スワイプが足りない場合は元に戻す
      setIsDragging(false);
      setStartX(null);
      setCurrentX(0);
    }
  };

  // カードのスタイル（位置と回転をJSから制御）
  const cardStyle: React.CSSProperties = {
    transform: `translateX(${currentX}px) rotate(${rotation}deg)`,
    // ドラッグ中は即時反映、ドラッグ終了時はスムーズに戻る
    transition: isDragging ? "none" : "transform 0.25s ease-out",
    opacity: isDragging && Math.abs(currentX) >= SWIPE_THRESHOLD ? 0.7 : 1,
  };

  // モーダルを閉じて次の映画を取得
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedMovie(null);
    fetchMovie();
  };

  // 「今すぐ見る」を選択
  const handleWatchNow = () => {
    if (selectedMovie) {
      saveSelectedMovie(selectedMovie, "watch_now");
      handleModalClose();
    }
  };

  // 「後で見る」を選択
  const handleWatchLater = () => {
    if (selectedMovie) {
      saveSelectedMovie(selectedMovie, "watch_later");
      handleModalClose();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 背景のグラデーション & Netflix風のレイアウト */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* ロゴ風ヘッダー */}
        <header className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between sm:left-10 sm:right-10 sm:top-8">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-sm bg-red-600 sm:h-8 sm:w-8" />
            <span className="text-lg font-semibold tracking-[0.25em] text-red-600 sm:text-xl">
              MOVIE SWIPE
            </span>
          </div>
          <a
            href="/selected"
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-4 sm:text-sm"
          >
            選んだリスト
          </a>
        </header>

        {/* 中央のカードエリア */}
        <section className="flex w-full max-w-md flex-col items-center gap-6">
          <h1 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            スワイプして映画を探す
          </h1>
          <p className="text-center text-sm text-zinc-400 sm:text-base">
            カードを左右にドラッグして新しい映画を表示します。
          </p>

          {/* 映画カード */}
          <div className="relative mt-4 h-[430px] w-full max-w-sm">
            {/* 背景のぼかしカード（奥行き表現） */}
            <div className="absolute inset-x-4 top-6 h-[380px] rounded-3xl bg-zinc-800/60 blur-sm" />

            {/* メインカード */}
            <div
              className="relative z-10 h-[400px] cursor-grab select-none rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/70 transition-shadow hover:shadow-black"
              style={cardStyle}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* ローディング表示 */}
              {loading && (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
                  <p className="text-sm text-zinc-400">映画を読み込み中…</p>
                </div>
              )}

              {/* エラー表示 */}
              {!loading && error && (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    type="button"
                    onClick={fetchMovie}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                  >
                    リトライ
                  </button>
                </div>
              )}

              {/* 映画情報表示 */}
              {!loading && !error && movie && (
                <div className="flex h-full flex-col overflow-hidden">
                  {/* ポスター部分 */}
                  <div className="relative h-64 w-full overflow-hidden">
                    {movie.poster_path ? (
                      // 画像は通常のimgでシンプルに表示（TMDbの画像ベースURLを使用）
                      <img
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-zinc-400">
                        No Image
                      </div>
                    )}

                    {/* 上部のグラデーション */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />
                    {/* 下部のグラデーション */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
                  </div>

                  {/* テキスト情報 */}
                  <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="line-clamp-2 text-lg font-semibold sm:text-xl">
                        {movie.title}
                      </h2>
                      <span className="shrink-0 text-sm font-medium text-yellow-400">
                        ★ {movie.rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-xs text-zinc-400 sm:text-sm">
                      {movie.overview || "あらすじ情報はありません。"}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-1 text-xs text-zinc-500">
                      <span>左：スキップ / 右：選ぶ</span>
                      <button
                        type="button"
                        onClick={fetchMovie}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                      >
                        別の映画を見る
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* フッター（TMDb利用規約の文言） */}
        <footer className="mt-10 text-center text-[11px] text-zinc-500 sm:text-xs">
          This product uses the TMDb API but is not endorsed or certified by
          TMDb
        </footer>
      </main>

      {/* 選んだ映画を表示するモーダル */}
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
              <p className="text-sm text-zinc-400">
                どうしますか？
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleWatchNow}
                className="rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-red-500"
              >
                今すぐ見る
              </button>
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

