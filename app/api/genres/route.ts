import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// TMDb ジャンル型定義
type TMDbGenre = {
  id: number;
  name: string;
};

type TMDbGenreResponse = {
  genres: TMDbGenre[];
};

/**
 * GET /api/genres
 * TMDb APIからジャンル一覧を取得
 */
export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not set in environment variables." },
      { status: 500 },
    );
  }

  try {
    const url = new URL(`${TMDB_BASE_URL}/genre/movie/list`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "ja-JP");

    const res = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to fetch genres from TMDb.",
          statusText: res.statusText,
          status: res.status,
          body: text || undefined,
        },
        { status: 500 },
      );
    }

    const data = (await res.json()) as TMDbGenreResponse;

    return NextResponse.json(data.genres, { status: 200 });
  } catch (error) {
    console.error("[TMDb] Unexpected error fetching genres:", error);
    return NextResponse.json(
      { error: "Unexpected error occurred while fetching genres." },
      { status: 500 },
    );
  }
}
