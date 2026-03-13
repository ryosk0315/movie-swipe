/**
 * MOVIE SWIPE データのエクスポート/インポート
 * localStorage の選んだ映画・お気に入り・統計を JSON でバックアップ
 */

export type ExportData = {
  version: number;
  exportedAt: string; // ISO 8601
  selectedMovies: unknown[];
  favoriteMovies: unknown[];
  swipeStats: unknown[];
  watchedMovies: number[];
  shownMovies: number[];
};

const STORAGE_KEYS = [
  "selectedMovies",
  "favoriteMovies",
  "swipeStats",
  "watchedMovies",
  "shownMovies",
] as const;

const EXPORT_VERSION = 1;

/**
 * 現在の localStorage からエクスポート用データを組み立てる
 */
export function buildExportData(): ExportData {
  if (typeof window === "undefined") {
    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      selectedMovies: [],
      favoriteMovies: [],
      swipeStats: [],
      watchedMovies: [],
      shownMovies: [],
    };
  }

  const selectedMovies = JSON.parse(
    localStorage.getItem("selectedMovies") || "[]",
  );
  const favoriteMovies = JSON.parse(
    localStorage.getItem("favoriteMovies") || "[]",
  );
  const swipeStats = JSON.parse(localStorage.getItem("swipeStats") || "[]");
  const watchedMovies = JSON.parse(
    localStorage.getItem("watchedMovies") || "[]",
  );
  const shownMovies = JSON.parse(
    localStorage.getItem("shownMovies") || "[]",
  );

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    selectedMovies,
    favoriteMovies,
    swipeStats,
    watchedMovies,
    shownMovies,
  };
}

/**
 * エクスポートデータを JSON 文字列にしてダウンロード
 */
export function downloadExport(): void {
  if (typeof window === "undefined") return;

  const data = buildExportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movie-swipe-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * インポート用データの形式チェック
 */
function isValidExportData(obj: unknown): obj is ExportData {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.version === "number" &&
    typeof o.exportedAt === "string" &&
    Array.isArray(o.selectedMovies) &&
    Array.isArray(o.favoriteMovies) &&
    Array.isArray(o.swipeStats) &&
    Array.isArray(o.watchedMovies) &&
    Array.isArray(o.shownMovies)
  );
}

/**
 * インポート用 JSON をパースして検証。エラー時はメッセージを返す
 */
export function parseImportFile(
  jsonString: string,
): { ok: true; data: ExportData } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (!isValidExportData(parsed)) {
      return {
        ok: false,
        error: "形式が正しくありません。MOVIE SWIPE のバックアップファイルを選んでください。",
      };
    }
    return { ok: true, data: parsed };
  } catch {
    return {
      ok: false,
      error: "JSON の読み取りに失敗しました。",
    };
  }
}

/**
 * 検証済みのエクスポートデータを localStorage に反映する
 */
export function applyImportData(data: ExportData): void {
  if (typeof window === "undefined") return;

  localStorage.setItem("selectedMovies", JSON.stringify(data.selectedMovies));
  localStorage.setItem("favoriteMovies", JSON.stringify(data.favoriteMovies));
  localStorage.setItem("swipeStats", JSON.stringify(data.swipeStats));
  localStorage.setItem("watchedMovies", JSON.stringify(data.watchedMovies));
  localStorage.setItem("shownMovies", JSON.stringify(data.shownMovies));
}

/**
 * localStorage の使用量を概算（バイト）で返す。未対応環境では null
 */
export function getStorageUsageBytes(): number | null {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) ?? "";
        total += key.length + value.length;
      }
    }
    // UTF-16 として 2 バイト/文字と仮定
    return total * 2;
  } catch {
    return null;
  }
}

/**
 * バイト数を人間が読みやすい文字列に変換
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
