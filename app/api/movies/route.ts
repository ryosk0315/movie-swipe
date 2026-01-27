// TMDbの映画をフィルター付きでランダムに1件取得するAPIルート
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
  runtime?: number;
};

type TMDbDiscoverResponse = {
  results: TMDbMovie[];
  total_results: number;
  total_pages: number;
};

// TMDb translations API のレスポンス型
type TMDbTranslation = {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  english_name: string;
  data: {
    title?: string;
    overview?: string;
  };
};

type TMDbTranslationsResponse = {
  id: number;
  translations: TMDbTranslation[];
};

/**
 * GET /api/movies
 * クエリパラメータ:
 * - genres: ジャンルID（カンマ区切り、例: 28,12）
 * - runtime: 上映時間の上限（例: 90, 120）
 * - year_from: リリース年の開始（例: 2020）
 * - year_to: リリース年の終了（例: 2024）
 * - providers: 配信サービスID（カンマ区切り、例: 8,9）
 */
export async function GET(request: Request) {
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
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const genres = searchParams.get("genres"); // カンマ区切りのジャンルID
    const runtime = searchParams.get("runtime"); // 上映時間の上限
    const yearFrom = searchParams.get("year_from"); // リリース年の開始
    const yearTo = searchParams.get("year_to"); // リリース年の終了
    const providers = searchParams.get("providers"); // 配信サービスID

    // TMDb discover API のURLを構築
    const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "ja-JP");
    url.searchParams.set("sort_by", "popularity.desc"); // 人気順
    url.searchParams.set("include_adult", "false"); // アダルトコンテンツを除外

    // フィルター条件を追加
    if (genres) {
      url.searchParams.set("with_genres", genres);
    }

    if (runtime) {
      url.searchParams.set("with_runtime.lte", runtime); // 上映時間の上限
    }

    if (yearFrom) {
      url.searchParams.set("primary_release_date.gte", `${yearFrom}-01-01`);
    }

    if (yearTo) {
      url.searchParams.set("primary_release_date.lte", `${yearTo}-12-31`);
    }

    if (providers) {
      url.searchParams.set("with_watch_providers", providers);
      url.searchParams.set("watch_region", "JP"); // 日本の配信情報
    }

    // ランダムなページを取得（1〜10ページのどれか）
    const randomPage = Math.floor(Math.random() * 10) + 1;
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
          error: "Failed to fetch movies from TMDb.",
          statusText: res.statusText,
          status: res.status,
          body: text || undefined,
        },
        { status: 500 },
      );
    }

    const data = (await res.json()) as TMDbDiscoverResponse;

    if (!data.results || data.results.length === 0) {
      // 結果が空の場合
      return NextResponse.json(
        { error: "No movies found with the specified filters." },
        { status: 404 },
      );
    }

    // 取得したページ内からランダムに1件ピックアップ
    const randomIndex = Math.floor(Math.random() * data.results.length);
    let movie = data.results[randomIndex];

    // translations API を使って日本語タイトル・あらすじを優先取得
    try {
      const translationsUrl = new URL(`${TMDB_BASE_URL}/movie/${movie.id}/translations`);
      translationsUrl.searchParams.set("api_key", apiKey);

      const translationsRes = await fetch(translationsUrl.toString(), {
        cache: "no-store",
      });

      if (translationsRes.ok) {
        const translationsData = (await translationsRes.json()) as TMDbTranslationsResponse;
        
        // 日本語（ja または ja-JP）の翻訳を探す
        const japaneseTranslation = translationsData.translations.find(
          (t) => t.iso_639_1 === "ja" || t.iso_3166_1 === "JP"
        );

        if (japaneseTranslation && japaneseTranslation.data) {
          // 日本語のタイトルとあらすじを使用
          if (japaneseTranslation.data.title) {
            movie.title = japaneseTranslation.data.title;
          }
          if (japaneseTranslation.data.overview) {
            movie.overview = japaneseTranslation.data.overview;
          }
        }
      }
    } catch (error) {
      console.error("[TMDb] Failed to fetch translations:", error);
      // エラーが出ても続行（次の方法を試す）
    }

    // translations で取得できなかった場合、日本語版の詳細情報を取得
    if (!movie.overview || movie.overview.trim() === "" || movie.title === movie.original_title) {
      try {
        const detailUrl = new URL(`${TMDB_BASE_URL}/movie/${movie.id}`);
        detailUrl.searchParams.set("api_key", apiKey);
        detailUrl.searchParams.set("language", "ja-JP");

        const detailRes = await fetch(detailUrl.toString(), {
          cache: "no-store",
        });

        if (detailRes.ok) {
          const detailData = (await detailRes.json()) as TMDbMovie;
          // 日本語版のタイトルとあらすじを使用（まだ設定されていない場合のみ）
          if (!movie.title || movie.title === movie.original_title) {
            movie.title = detailData.title || movie.title;
          }
          if (!movie.overview || movie.overview.trim() === "") {
            movie.overview = detailData.overview || movie.overview;
          }
        }
      } catch (error) {
        console.error("[TMDb] Failed to fetch Japanese details:", error);
        // エラーが出ても続行（元のデータを使用）
      }
    }

    // 日本語のあらすじが空の場合、英語版を取得
    if (!movie.overview || movie.overview.trim() === "") {
      try {
        const detailUrl = new URL(`${TMDB_BASE_URL}/movie/${movie.id}`);
        detailUrl.searchParams.set("api_key", apiKey);
        detailUrl.searchParams.set("language", "en-US");

        const detailRes = await fetch(detailUrl.toString(), {
          cache: "no-store",
        });

        if (detailRes.ok) {
          const detailData = (await detailRes.json()) as TMDbMovie;
          // 英語のあらすじを使用
          movie = { ...movie, overview: detailData.overview };
        }
      } catch (error) {
        console.error("[TMDb] Failed to fetch English overview:", error);
        // エラーが出ても続行（日本語の空のあらすじのまま）
      }
    }

    // クライアントに返すための整形
    const normalizedMovie = {
      id: movie.id,
      // TMDbは映画とTVでtitle/nameが異なる可能性があるためフォールバック
      title: movie.title || movie.name || movie.original_title || "Untitled",
      rating: movie.vote_average,
      poster_path: movie.poster_path,
      overview: movie.overview || "あらすじ情報はありません。",
      runtime: movie.runtime,
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

