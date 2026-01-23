import { NextResponse } from "next/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// TMDb 配信サービス型定義
type TMDbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

type TMDbProvidersResponse = {
  results: TMDbProvider[];
};

/**
 * GET /api/providers
 * TMDb APIから日本で利用可能な配信サービス一覧を取得
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
    const url = new URL(`${TMDB_BASE_URL}/watch/providers/movie`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "ja-JP");
    url.searchParams.set("watch_region", "JP");

    const res = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to fetch providers from TMDb.",
          statusText: res.statusText,
          status: res.status,
          body: text || undefined,
        },
        { status: 500 },
      );
    }

    const data = (await res.json()) as TMDbProvidersResponse;

    // 主要な配信サービスのみをフィルタリング（オプション）
    const majorProviders = [8, 9, 337, 350, 119]; // Netflix, Prime, Disney+, Apple TV+, Hulu
    const filteredProviders = data.results.filter((p) =>
      majorProviders.includes(p.provider_id),
    );

    // フィルタリング後のプロバイダーがない場合は全て返す
    const providers = filteredProviders.length > 0 ? filteredProviders : data.results;

    return NextResponse.json(providers, { status: 200 });
  } catch (error) {
    console.error("[TMDb] Unexpected error fetching providers:", error);
    return NextResponse.json(
      { error: "Unexpected error occurred while fetching providers." },
      { status: 500 },
    );
  }
}
