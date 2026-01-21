// 映画の配信サービス情報を取得するAPIルート
// TMDb APIの /movie/{id}/watch/providers を使用

import { NextResponse } from "next/server";

// TMDbのベースURL
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// TMDbの配信サービス情報の型
type TMDbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
};

type TMDbWatchProvidersResponse = {
  id: number;
  results: {
    JP?: {
      link?: string;
      flatrate?: TMDbProvider[];
      rent?: TMDbProvider[];
      buy?: TMDbProvider[];
    };
  };
};

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
      { error: "Invalid movie ID." },
      { status: 400 },
    );
  }

  try {
    const url = new URL(`${TMDB_BASE_URL}/movie/${id}/watch/providers`);
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to fetch watch providers from TMDb.",
          statusText: res.statusText,
          status: res.status,
          body: text || undefined,
        },
        { status: 500 },
      );
    }

    const data = (await res.json()) as TMDbWatchProvidersResponse;

    // 日本の配信サービス情報を取得
    const jpProviders = data.results.JP;

    if (!jpProviders) {
      return NextResponse.json(
        {
          link: null,
          flatrate: [],
          rent: [],
          buy: [],
        },
        { status: 200 },
      );
    }

    // クライアントに返すための整形
    const normalizedProviders = {
      link: jpProviders.link || null,
      flatrate:
        jpProviders.flatrate?.map((p) => ({
          id: p.provider_id,
          name: p.provider_name,
          logo_path: p.logo_path,
        })) || [],
      rent:
        jpProviders.rent?.map((p) => ({
          id: p.provider_id,
          name: p.provider_name,
          logo_path: p.logo_path,
        })) || [],
      buy:
        jpProviders.buy?.map((p) => ({
          id: p.provider_id,
          name: p.provider_name,
          logo_path: p.logo_path,
        })) || [],
    };

    return NextResponse.json(normalizedProviders, { status: 200 });
  } catch (error) {
    console.error("[TMDb] Unexpected error:", error);

    return NextResponse.json(
      { error: "Unexpected error occurred while fetching watch providers." },
      { status: 500 },
    );
  }
}
