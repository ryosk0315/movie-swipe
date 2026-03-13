/**
 * デバイス判定（モバイル / PC）
 * 「今見る」でスマホならアプリ・PCならサイトに遷移するために使用
 */

export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  if (mobileKeywords.test(ua)) return true;
  // タッチデバイスかつ画面幅が狭い場合
  if ("ontouchstart" in window && window.innerWidth < 768) return true;
  return false;
}
