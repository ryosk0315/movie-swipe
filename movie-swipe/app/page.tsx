"use client";

// 映画スワイプ画面
// - /api/movies から映画を1件取得
// - カードをドラッグ＆スワイプして次の映画へ
// - 右スワイプで「選ぶ」、左スワイプで「スキップ」
// - Netflix風の黒背景デザイン

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FilterModal, { type FilterOptions } from "./components/FilterModal";
import TimeRecommendationModal from "./components/TimeRecommendationModal";

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

// 「見たい山」の映画型
type CandidateMovie = Movie & {
  addedAt: number; // タイムスタンプ
};

// 統計データの型
type SwipeStat = {
  movieId: number;
  timestamp: number;
  direction: "left" | "right" | "down" | "up"; // 左：スキップ、右：選ぶ、下：見たことある、上：お気に入り
};

// お気に入りの映画型
type FavoriteMovie = Movie & {
  addedAt: number; // タイムスタンプ
};

// スワイプ判定に使うしきい値（px）
const SWIPE_THRESHOLD = 100;
// 選択タイムに移行するスワイプ数
const MAX_SWIPES = 20;

export default function Home() {
  // 現在表示している映画
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // カードのドラッグ状態
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number>(0);
  const [currentY, setCurrentY] = useState<number>(0);

  // 選んだ映画を表示するモーダルの状態
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedMovieProviders, setSelectedMovieProviders] = useState<any>(null);
  const [loadingSelectedProviders, setLoadingSelectedProviders] = useState<boolean>(false);

  // フィルターモーダルの表示状態
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // 時間帯レコメンドモーダルの表示状態
  const [showTimeRecommendationModal, setShowTimeRecommendationModal] = useState<boolean>(false);

  // ヘッダー右上の「その他メニュー」の表示状態
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // スワイプカウントと「見たい山」の管理
  const [swipeCount, setSwipeCount] = useState<number>(0);
  const [candidates, setCandidates] = useState<CandidateMovie[]>([]);

  // 映画詳細モーダルの状態
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [isDragged, setIsDragged] = useState<boolean>(false);

  // 次に表示する映画を先読みしておくための状態（プリフェッチ用）
  const [nextMovie, setNextMovie] = useState<Movie | null>(null);

  // フィルター条件の状態
  const [filters, setFilters] = useState<FilterOptions>({
    genres: [],
    runtime: null,
    yearFrom: null,
    yearTo: null,
    providers: [],
  });

  // スワイプで次の映画を読み込む処理
  const fetchMovie = useCallback(async (retryWithoutFilters = false, retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // リトライ時はフィルターをリセット
      const currentFilters = retryWithoutFilters
        ? { genres: [], runtime: null, yearFrom: null, yearTo: null, providers: [] }
        : filters;

      // フィルター条件をクエリパラメータに変換
      const params = new URLSearchParams();
      if (currentFilters.genres.length > 0) {
        params.set("genres", currentFilters.genres.join(","));
      }
      if (currentFilters.runtime) {
        params.set("runtime", String(currentFilters.runtime));
      }
      if (currentFilters.yearFrom) {
        params.set("year_from", String(currentFilters.yearFrom));
      }
      if (currentFilters.yearTo) {
        params.set("year_to", String(currentFilters.yearTo));
      }
      if (currentFilters.providers.length > 0) {
        params.set("providers", currentFilters.providers.join(","));
      }

      const url = `/api/movies${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        
        // 404エラー（映画が見つからない）の場合
        if (res.status === 404 && !retryWithoutFilters) {
          // フィルターをリセットして再試行
          setFilters({
            genres: [],
            runtime: null,
            yearFrom: null,
            yearTo: null,
            providers: [],
          });
          setError("条件に合う映画がなくなりました。フィルターをリセットしています...");
          
          // 2秒後に再試行
          setTimeout(() => {
            fetchMovie(true);
          }, 2000);
          return;
        }
        
        throw new Error(body?.error || "映画の取得に失敗しました。");
      }

      const data = (await res.json()) as Movie;
      
      // 表示済み映画のIDを取得
      const shownMovies = localStorage.getItem("shownMovies");
      const shownList: number[] = shownMovies ? JSON.parse(shownMovies) : [];
      
      // 「見たことある」映画のIDを取得
      const watchedMovies = localStorage.getItem("watchedMovies");
      const watchedList: number[] = watchedMovies ? JSON.parse(watchedMovies) : [];
      
      // 表示済みまたは「見たことある」映画を除外（最大10回まで再試行）
      if ((shownList.includes(data.id) || watchedList.includes(data.id)) && retryCount < 10) {
        // 表示済みまたは「見たことある」映画の場合は再取得
        return fetchMovie(retryWithoutFilters, retryCount + 1);
      }
      
      // 表示済みリストに追加（最大100件まで保持）
      const updatedShownList = [...shownList, data.id];
      if (updatedShownList.length > 100) {
        updatedShownList.shift(); // 古いものを削除
      }
      localStorage.setItem("shownMovies", JSON.stringify(updatedShownList));

      setMovie(data);
      // 現在の映画が決まったタイミングで、次の映画をバックグラウンドで先読み
      if (!nextMovie) {
        prefetchNextMovie();
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "予期しないエラーが発生しました。";
      setError(message);
    } finally {
      setLoading(false);
      // 次のカードに備えて位置をリセット
      setStartX(null);
      setStartY(null);
      setCurrentX(0);
      setCurrentY(0);
      setIsDragging(false);
    }
  }, [filters]);

  // 初回マウント時と filters 変更時に映画を取得（重複削除のため下に統合）

  // カードの回転角（Xの移動量に応じて少し傾ける）
  const rotation = (currentX / 10) * 1.5; // ほどよい傾きに調整

  // ドラッグ開始（マウス）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragged(false); // ドラッグフラグをリセット
  };

  // ドラッグ中（マウス）
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || startX === null || startY === null) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    setCurrentX(deltaX);
    setCurrentY(deltaY);
    
    // 5px以上移動したらドラッグと判定
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setIsDragged(true);
    }
  };

  // ドラッグ終了（マウス）
  const handleMouseUp = () => {
    if (!isDragging) return;
    
    // ドラッグされていなければクリックと判定
    if (!isDragged && movie) {
      handleCardClick();
    } else {
      finishSwipe();
    }
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
    setStartY(touch.clientY);
    setIsDragged(false); // ドラッグフラグをリセット
    // 画面のスクロールを防ぐ
    e.preventDefault();
  };

  // タッチ移動
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || startX === null || startY === null) return;
    // 画面のスクロールを防ぐ
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    setCurrentX(deltaX);
    setCurrentY(deltaY);
    
    // 5px以上移動したらドラッグと判定
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setIsDragged(true);
    }
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

  // カードクリック時に詳細情報を取得
  const handleCardClick = async () => {
    if (!movie) return;
    
    setLoadingDetails(true);
    setShowDetailsModal(true);
    
    try {
      const res = await fetch(`/api/movies/${movie.id}/details`, {
        cache: "no-store",
      });
      
      if (res.ok) {
        const details = await res.json();
        setMovieDetails(details);
      } else {
        setMovieDetails(null);
      }
    } catch (error) {
      console.error("Failed to fetch movie details:", error);
      setMovieDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 「見たい山」に映画を追加
  const addToCandidate = useCallback((movie: Movie) => {
    const candidate: CandidateMovie = {
      ...movie,
      addedAt: Date.now(),
    };
    setCandidates((prev) => {
      // 重複チェック
      if (prev.some((m) => m.id === movie.id)) {
        return prev;
      }
      return [...prev, candidate];
    });
  }, []);

  // 「見たことある」映画をlocalStorageに保存
  const markAsWatched = useCallback((movie: Movie) => {
    const existing = localStorage.getItem("watchedMovies");
    const list: number[] = existing ? JSON.parse(existing) : [];
    if (!list.includes(movie.id)) {
      list.push(movie.id);
      localStorage.setItem("watchedMovies", JSON.stringify(list));
    }
  }, []);

  // お気に入りに追加
  const addToFavorites = useCallback((movie: Movie) => {
    const favorite: FavoriteMovie = {
      ...movie,
      addedAt: Date.now(),
    };
    const existing = localStorage.getItem("favoriteMovies");
    const list: FavoriteMovie[] = existing ? JSON.parse(existing) : [];
    // 重複チェック
    if (!list.some((m) => m.id === movie.id)) {
      list.unshift(favorite); // 最新を先頭に
      localStorage.setItem("favoriteMovies", JSON.stringify(list));
    }
  }, []);

  // 統計データを保存
  const saveSwipeStat = useCallback((movieId: number, direction: "left" | "right" | "down" | "up") => {
    const stat: SwipeStat = {
      movieId,
      timestamp: Date.now(),
      direction,
    };
    const existing = localStorage.getItem("swipeStats");
    const stats: SwipeStat[] = existing ? JSON.parse(existing) : [];
    stats.push(stat);
    // 最大1000件まで保持（古いものから削除）
    if (stats.length > 1000) {
      stats.shift();
    }
    localStorage.setItem("swipeStats", JSON.stringify(stats));
  }, []);

  // 次の映画をバックグラウンドで取得（プリフェッチ）
  const prefetchNextMovie = useCallback(async () => {
    // すでにプリフェッチ済み、あるいは現在読み込み中なら何もしない
    if (nextMovie || loading) return;

    try {
      // フィルター条件をクエリパラメータに変換
      const params = new URLSearchParams();
      if (filters.genres.length > 0) {
        params.set("genres", filters.genres.join(","));
      }
      if (filters.runtime) {
        params.set("runtime", String(filters.runtime));
      }
      if (filters.yearFrom) {
        params.set("year_from", String(filters.yearFrom));
      }
      if (filters.yearTo) {
        params.set("year_to", String(filters.yearTo));
      }
      if (filters.providers.length > 0) {
        params.set("providers", filters.providers.join(","));
      }

      // 「見たことある」映画と「表示済み」映画を除外
      const watchedMovies = JSON.parse(localStorage.getItem("watchedMovies") || "[]");
      const shownMovies = JSON.parse(localStorage.getItem("shownMovies") || "[]");
      const excludedIds = [...new Set([...watchedMovies, ...shownMovies])];
      if (excludedIds.length > 0) {
        params.set("without_ids", excludedIds.join(","));
      }

      const url = `/api/movies${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = (await res.json()) as Movie;
      setNextMovie(data);
    } catch (error) {
      console.error("Failed to prefetch movie:", error);
    }
  }, [filters, nextMovie, loading]);

  // スワイプの最終判定処理
  const finishSwipe = () => {
    const distanceX = currentX;
    const distanceY = currentY;

    // 縦方向の移動が横方向より大きい場合
    if (Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) >= SWIPE_THRESHOLD && movie) {
      if (distanceY > 0) {
        // 下スワイプ = 「見たことある」とマーク
        setIsDragging(false);
        setCurrentY(window.innerHeight);
        markAsWatched(movie);
        saveSwipeStat(movie.id, "down"); // 統計データを保存
        
        setTimeout(() => {
          // スワイプカウントをインクリメント
          const newCount = swipeCount + 1;
          setSwipeCount(newCount);
          
          // 20本スワイプしたら選択タイムに移行
          if (newCount >= MAX_SWIPES) {
            localStorage.setItem("candidates", JSON.stringify(candidates));
            window.location.href = "/choose";
          } else {
            // 次の映画を即座に表示（プリフェッチされていればそれを使う）
            setStartX(null);
            setStartY(null);
            setCurrentX(0);
            setCurrentY(0);
            if (nextMovie) {
              setMovie(nextMovie);
              setNextMovie(null);
              prefetchNextMovie();
            } else {
              fetchMovie();
            }
          }
        }, 100);
        return;
      } else {
        // 上スワイプ = お気に入りに追加
        setIsDragging(false);
        setCurrentY(-window.innerHeight);
        addToFavorites(movie);
        saveSwipeStat(movie.id, "up"); // 統計データを保存
        
        setTimeout(() => {
          // スワイプカウントをインクリメント
          const newCount = swipeCount + 1;
          setSwipeCount(newCount);
          
          // 20本スワイプしたら選択タイムに移行
          if (newCount >= MAX_SWIPES) {
            localStorage.setItem("candidates", JSON.stringify(candidates));
            window.location.href = "/choose";
          } else {
            // 次の映画を即座に表示（プリフェッチされていればそれを使う）
            setStartX(null);
            setStartY(null);
            setCurrentX(0);
            setCurrentY(0);
            if (nextMovie) {
              setMovie(nextMovie);
              setNextMovie(null);
              prefetchNextMovie();
            } else {
              fetchMovie();
            }
          }
        }, 100);
        return;
      }
    }

    // 規定値以上スワイプしていたら処理
    if (Math.abs(distanceX) >= SWIPE_THRESHOLD) {
      if (distanceX > 0 && movie) {
        // 右スワイプ = 「見たい山」に追加
        setIsDragging(false);
        setCurrentX(window.innerWidth);
        
        // 「見たい山」に追加
        addToCandidate(movie);
        saveSwipeStat(movie.id, "right"); // 統計データを保存
        
        setTimeout(() => {
          // スワイプカウントをインクリメント
          const newCount = swipeCount + 1;
          setSwipeCount(newCount);
          
          // 20本スワイプしたら選択タイムに移行
          if (newCount >= MAX_SWIPES) {
            // localStorageに保存してから遷移
            localStorage.setItem("candidates", JSON.stringify([...candidates, { ...movie, addedAt: Date.now() }]));
            window.location.href = "/choose";
          } else {
            // 次の映画を即座に表示（プリフェッチされていればそれを使う）
            setStartX(null);
            setStartY(null);
            setCurrentX(0);
            setCurrentY(0);
            if (nextMovie) {
              setMovie(nextMovie);
              setNextMovie(null);
              prefetchNextMovie();
            } else {
              fetchMovie();
            }
          }
        }, 100); // アニメーション時間を250ms → 100msに短縮
      } else {
        // 左スワイプ = スキップ
        setIsDragging(false);
        setCurrentX(-window.innerWidth);
        
        if (movie) {
          saveSwipeStat(movie.id, "left"); // 統計データを保存
        }
        
        setTimeout(() => {
          // スワイプカウントをインクリメント
          const newCount = swipeCount + 1;
          setSwipeCount(newCount);
          
          // 20本スワイプしたら選択タイムに移行
          if (newCount >= MAX_SWIPES) {
            // localStorageに保存してから遷移
            localStorage.setItem("candidates", JSON.stringify(candidates));
            window.location.href = "/choose";
          } else {
            // 次の映画を即座に表示（プリフェッチされていればそれを使う）
            setStartX(null);
            setStartY(null);
            setCurrentX(0);
            setCurrentY(0);
            if (nextMovie) {
              setMovie(nextMovie);
              setNextMovie(null);
              prefetchNextMovie();
            } else {
              fetchMovie();
            }
          }
        }, 100); // アニメーション時間を250ms → 100msに短縮
      }
    } else {
      // スワイプが足りない場合は元に戻す
      setIsDragging(false);
      setStartX(null);
      setStartY(null);
      setCurrentX(0);
      setCurrentY(0);
    }
  };

  // カードのスタイル（位置と回転をJSから制御）
  const cardStyle: React.CSSProperties = {
    transform: `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`,
    // ドラッグ中は即時反映、ドラッグ終了時はスムーズに戻る（アニメーション時間を短縮）
    transition: isDragging ? "none" : "transform 0.1s ease-out",
    opacity: isDragging && (Math.abs(currentX) >= SWIPE_THRESHOLD || Math.abs(currentY) >= SWIPE_THRESHOLD) ? 0.7 : 1,
  };

  // モーダルを閉じて次の映画を取得
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedMovie(null);
    setSelectedMovieProviders(null);
    fetchMovie();
  };

  // モーダルが開いた時に配信サービス情報を取得
  useEffect(() => {
    if (showModal && selectedMovie) {
      fetchSelectedMovieProviders(selectedMovie.id);
    }
  }, [showModal, selectedMovie]);

  // 配信サービス情報を取得
  const fetchSelectedMovieProviders = async (movieId: number) => {
    setLoadingSelectedProviders(true);
    try {
      const res = await fetch(`/api/movies/${movieId}/providers`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedMovieProviders(data);
      }
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    } finally {
      setLoadingSelectedProviders(false);
    }
  };

  // 「今すぐ見る」を選択
  const handleWatchNow = async () => {
    if (selectedMovie) {
      // 配信サービス情報を取得
      await fetchSelectedMovieProviders(selectedMovie.id);
      // 配信サービスがない場合は、保存してモーダルを閉じる
      if (!selectedMovieProviders || (!selectedMovieProviders.flatrate || selectedMovieProviders.flatrate.length === 0)) {
        saveSelectedMovie(selectedMovie, "watch_now");
        handleModalClose();
      }
    }
  };

  // 「後で見る」を選択
  const handleWatchLater = () => {
    if (selectedMovie) {
      saveSelectedMovie(selectedMovie, "watch_later");
      handleModalClose();
    }
  };

  // フィルター適用時のハンドラー
  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // フィルターを適用したら、すぐに新しい映画を取得
    // fetchMovie は filters の変更で自動的に再実行される
  };

  // filters が変更されたら映画を再取得
  useEffect(() => {
    fetchMovie();
  }, [filters, fetchMovie]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 背景のグラデーション & Netflix風のレイアウト */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black via-black/90 to-zinc-950" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* ロゴ風ヘッダー */}
        <header className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between sm:left-10 sm:right-10 sm:top-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="h-7 w-7 rounded-sm bg-red-600 sm:h-8 sm:w-8" />
            <span className="text-lg font-semibold tracking-[0.25em] text-red-600 sm:text-xl">
              MOVIE SWIPE
            </span>
          </Link>
          <div className="relative flex items-center gap-1 sm:gap-2">
            {/* 1軍ボタン：フィルター & 選んだリスト */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              🎬 フィルター
            </button>
            <a
              href="/selected"
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              選んだリスト
            </a>

            {/* その他の機能はメニューに集約 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 sm:px-3 sm:py-1.5 sm:text-xs"
              >
                ⋯ メニュー
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-1 w-40 rounded-lg border border-zinc-800 bg-zinc-900/95 py-1 text-xs shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimeRecommendationModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
                  >
                    <span>🎯 時間帯レコメンド</span>
                  </button>
                  <a
                    href="/stats"
                    onClick={() => setShowMoreMenu(false)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
                  >
                    <span>📊 統計</span>
                  </a>
                  <a
                    href="/vote"
                    onClick={() => setShowMoreMenu(false)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
                  >
                    <span>👥 投票モード</span>
                  </a>
                  <a
                    href="/favorites"
                    onClick={() => setShowMoreMenu(false)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-zinc-300 hover:bg-zinc-800"
                  >
                    <span>⭐ お気に入り</span>
                  </a>
                </div>
              )}
            </div>
          </div>
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
              /* スワイプ中にブラウザのスクロールが発生しないように、カード上ではタッチスクロールを無効化 */
              style={{ ...cardStyle, touchAction: "none" }}
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
                    onClick={() => fetchMovie()}
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

                    <div className="mt-auto space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>左：スキップ / 右：選ぶ / 上：お気に入り / 下：見たことある</span>
                        <button
                          type="button"
                          onClick={() => fetchMovie()}
                          className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                        >
                          別の映画を見る
                        </button>
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium text-zinc-400">
                          {swipeCount}/{MAX_SWIPES}本 スワイプ済み
                        </span>
                        {candidates.length > 0 && (
                          <span className="ml-2 text-xs text-red-400">
                            （{candidates.length}本を選択中）
                          </span>
                        )}
                      </div>
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

            {/* 配信サービスリンク */}
            {loadingSelectedProviders ? (
              <div className="mb-4 flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
              </div>
            ) : selectedMovieProviders && selectedMovieProviders.flatrate && selectedMovieProviders.flatrate.length > 0 ? (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-semibold text-zinc-300">配信サービス</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMovieProviders.flatrate.map((provider: any) => (
                    <a
                      key={provider.provider_id}
                      href={selectedMovieProviders.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
                      onClick={() => {
                        saveSelectedMovie(selectedMovie, "watch_now");
                        handleModalClose();
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
              {(!selectedMovieProviders || !selectedMovieProviders.flatrate || selectedMovieProviders.flatrate.length === 0) && (
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

      {/* 映画詳細モーダル */}
      {showDetailsModal && movie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 p-6 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="absolute right-4 top-4 text-zinc-400 transition-colors hover:text-white z-10"
            >
              ✕
            </button>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
              </div>
            ) : movieDetails ? (
              <div className="space-y-6">
                {/* タイトルと基本情報 */}
                <div>
                  <h3 className="mb-2 text-2xl font-bold">{movieDetails.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                    {movieDetails.release_year && (
                      <span className="flex items-center gap-1">
                        📅 {movieDetails.release_year}年
                      </span>
                    )}
                    {movieDetails.runtime && (
                      <span className="flex items-center gap-1">
                        ⏱️ {movieDetails.runtime}分
                      </span>
                    )}
                  </div>
                </div>

                {/* 監督 */}
                {movieDetails.directors && movieDetails.directors.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-300">監督</h4>
                    <p className="text-base text-white">
                      {movieDetails.directors.join(", ")}
                    </p>
                  </div>
                )}

                {/* 出演者 */}
                {movieDetails.cast && movieDetails.cast.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-300">出演者</h4>
                    <div className="flex flex-wrap gap-2">
                      {movieDetails.cast.map((actor: any, index: number) => (
                        <span
                          key={index}
                          className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-white"
                        >
                          {actor.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 配信サービス */}
                {movieDetails.providers && movieDetails.providers.flatrate && movieDetails.providers.flatrate.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-300">
                      配信サービス
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {movieDetails.providers.flatrate.map((provider: any) => (
                        <div
                          key={provider.provider_id}
                          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2"
                        >
                          {provider.logo_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="h-6 w-6 rounded"
                            />
                          )}
                          <span className="text-sm text-white">
                            {provider.provider_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* あらすじ */}
                {movieDetails.overview && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-zinc-300">あらすじ</h4>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {movieDetails.overview}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400">
                詳細情報の取得に失敗しました。
              </div>
            )}
          </div>
        </div>
      )}

      {/* フィルターモーダル */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentFilters={filters}
        onApply={handleApplyFilters}
      />

      {/* 時間帯レコメンドモーダル */}
      <TimeRecommendationModal
        isOpen={showTimeRecommendationModal}
        onClose={() => setShowTimeRecommendationModal(false)}
        onApply={handleApplyFilters}
      />
    </div>
  );
}

