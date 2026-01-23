import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// TMDb 映画詳細の型
type TMDbMovieDetails = {
  id: number;
  title: string;
  runtime: number;
  release_date: string;
  overview: string;
};

// TMDb クレジット情報の型
type TMDbCast = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type TMDbCrew = {
  id: number;
  name: string;
  job: string;
};

type TMDbCredits = {
  cast: TMDbCast[];
  crew: TMDbCrew[];
};

// TMDb 配信情報の型
type TMDbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

type TMDbWatchProviders = {
  results: {
    JP?: {
      link?: string;
      flatrate?: TMDbProvider[];
      rent?: TMDbProvider[];
      buy?: TMDbProvider[];
    };
  };
};

/**
 * GET /api/movies/[id]/details
 * 映画の詳細情報を取得（監督、出演者、上映時間、リリース年、配信サービス）
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not set in environment variables." },
      { status: 500 },
    );
  }

  if (!id || isNaN(Number(id))) {
    return NextResponse.json(
      { error: "Invalid movie ID provided." },
      { status: 400 },
    );
  }

  try {
    // 3つのAPIを並行して取得
    const [detailsRes, creditsRes, providersRes] = await Promise.all([
      // 1. 映画の基本情報
      fetch(
        `${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}&language=ja-JP`,
        { cache: "no-store" },
      ),
      // 2. 監督・出演者情報
      fetch(
        `${TMDB_BASE_URL}/movie/${id}/credits?api_key=${apiKey}&language=ja-JP`,
        { cache: "no-store" },
      ),
      // 3. 配信情報
      fetch(
        `${TMDB_BASE_URL}/movie/${id}/watch/providers?api_key=${apiKey}`,
        { cache: "no-store" },
      ),
    ]);

    if (!detailsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch movie details from TMDb." },
        { status: 500 },
      );
    }

    const details = (await detailsRes.json()) as TMDbMovieDetails;
    const credits = creditsRes.ok
      ? ((await creditsRes.json()) as TMDbCredits)
      : { cast: [], crew: [] };
    const providers = providersRes.ok
      ? ((await providersRes.json()) as TMDbWatchProviders)
      : { results: {} };

    // 監督を抽出
    const directors = credits.crew
      .filter((c) => c.job === "Director")
      .map((c) => c.name);

    // 主要キャストを抽出（上位5人）
    const cast = credits.cast.slice(0, 5).map((c) => ({
      name: c.name,
      character: c.character,
      profile_path: c.profile_path,
    }));

    // 日本の配信情報を抽出
    const jpProviders = providers.results.JP;
    const normalizedProviders = {
      link: jpProviders?.link || null,
      flatrate: jpProviders?.flatrate || [],
      rent: jpProviders?.rent || [],
      buy: jpProviders?.buy || [],
    };

    // リリース年を抽出
    const releaseYear = details.release_date
      ? new Date(details.release_date).getFullYear()
      : null;

    return NextResponse.json(
      {
        id: details.id,
        title: details.title,
        runtime: details.runtime,
        release_year: releaseYear,
        overview: details.overview,
        directors,
        cast,
        providers: normalizedProviders,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[TMDb] Unexpected error fetching movie details:", error);
    return NextResponse.json(
      { error: "Unexpected error occurred while fetching movie details." },
      { status: 500 },
    );
  }
}
