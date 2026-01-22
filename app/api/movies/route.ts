// TMDbの人気映画からランダムに1件取得するAPIルート
// 日本語コメント付きで実装

import { NextResponse } from "next/server";

// TMDbのベースURL
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// TMDbのレスポンス型（必要な範囲のみ定義）
type TMDbMovie = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  vote_average: number;
  poster_path: string | null;
  overview: string;
};

type TMDbPopularResponse = {
  results: TMDbMovie[];
  total_results: number;
  total_pages: number;
};

export async function GET() {
  // 環境変数からAPIキーを取得
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    // APIキー未設定時は500エラーを返す
    return NextResponse.json(
      { error: "TMDB_API_KEY is not set in environment variables." },
      { status: 500 },
    );
  }

  try {
    // 人気映画のランダムなページを取得（1〜10ページのどれか）
    const randomPage = Math.floor(Math.random() * 10) + 1;

    const url = new URL(`${TMDB_BASE_URL}/movie/popular`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "ja-JP");
    url.searchParams.set("page", String(randomPage));

    const res = await fetch(url.toString(), {
      // サーバー側からTMDbを叩くので再検証は不要
      cache: "no-store",
    });

    if (!res.ok) {
      // TMDb側のエラーをラップして返す
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to fetch popular movies from TMDb.",
          statusText: res.statusText,
          status: res.status,
          body: text || undefined,
        },
        { status: 500 },
      );
    }

    const data = (await res.json()) as TMDbPopularResponse;

    if (!data.results || data.results.length === 0) {
      // 結果が空の場合
      return NextResponse.json(
        { error: "No popular movies found from TMDb." },
        { status: 404 },
      );
    }

    // 取得したページ内からランダムに1件ピックアップ
    const randomIndex = Math.floor(Math.random() * data.results.length);
    const movie = data.results[randomIndex];

    // クライアントに返すための整形
    const normalizedMovie = {
      id: movie.id,
      // TMDbは映画とTVでtitle/nameが異なる可能性があるためフォールバック
      title: movie.title || movie.name || movie.original_title || "Untitled",
      rating: movie.vote_average,
      poster_path: movie.poster_path,
      overview: movie.overview,
    };

    return NextResponse.json(normalizedMovie, { status: 200 });
  } catch (error) {
    console.error("[TMDb] Unexpected error:", error);

    // 想定外エラー時のレスポンス
    return NextResponse.json(
      { error: "Unexpected error occurred while fetching movie." },
      { status: 500 },
    );
  }
}

