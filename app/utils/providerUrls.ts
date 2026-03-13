/**
 * 配信サービスごとの視聴URL生成
 * 「今見る」でスマホならアプリ・PCならサイトに遷移するために使用
 * TMDbの link は「どこで見れるか」のページなので、主要プロバイダーはアプリ/サイト直リンクを優先
 */

// TMDb provider_id の代表値
const PROVIDER_IDS = {
  NETFLIX: 8,
  AMAZON: 9,
  DISNEY_PLUS: 337,
  APPLE_TV: 350,
  HULU: 119,
} as const;

/**
 * プロバイダーIDとデバイスに応じた視聴URLを返す
 * @param providerId TMDbの provider_id
 * @param fallbackLink TMDbの watch ページURL（取得できない場合のフォールバック）
 * @param isMobile モバイル端末かどうか
 */
export function getProviderWatchUrl(
  providerId: number,
  fallbackLink: string | null,
  isMobile: boolean,
): string {
  const fallback = fallbackLink && fallbackLink.startsWith("http") ? fallbackLink : "https://www.themoviedb.org/";

  switch (providerId) {
    case PROVIDER_IDS.NETFLIX:
      return isMobile ? "https://www.netflix.com" : "https://www.netflix.com";
    case PROVIDER_IDS.AMAZON:
      return isMobile
        ? "https://www.primevideo.com"
        : "https://www.primevideo.com";
    case PROVIDER_IDS.DISNEY_PLUS:
      return isMobile
        ? "https://www.disneyplus.com/ja-jp"
        : "https://www.disneyplus.com/ja-jp";
    case PROVIDER_IDS.APPLE_TV:
      return isMobile
        ? "https://tv.apple.com/jp"
        : "https://tv.apple.com/jp";
    case PROVIDER_IDS.HULU:
      return isMobile ? "https://www.hulu.com" : "https://www.hulu.com";
    default:
      return fallback;
  }
}
