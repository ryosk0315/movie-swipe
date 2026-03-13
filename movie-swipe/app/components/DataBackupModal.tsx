"use client";

import { useCallback, useRef, useState } from "react";
import {
  applyImportData,
  downloadExport,
  formatBytes,
  getStorageUsageBytes,
  parseImportFile,
} from "../utils/dataExport";

type DataBackupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void; // インポート後に親でデータ再読み込みする用
};

export default function DataBackupModal({
  isOpen,
  onClose,
  onImportComplete,
}: DataBackupModalProps) {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usageBytes = getStorageUsageBytes();
  const usageText =
    usageBytes !== null
      ? `使用量: 約 ${formatBytes(usageBytes)}`
      : "使用量: 取得できません";

  const handleExport = useCallback(() => {
    downloadExport();
    onClose();
  }, [onClose]);

  const handleImportClick = useCallback(() => {
    setImportError(null);
    setImportSuccess(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setImportError(null);
      setImportSuccess(false);

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== "string") {
          setImportError("ファイルの読み取りに失敗しました。");
          return;
        }
        const result = parseImportFile(text);
        if (!result.ok) {
          setImportError(result.error);
          return;
        }
        applyImportData(result.data);
        setImportSuccess(true);
        onImportComplete?.();
      };
      reader.onerror = () => setImportError("ファイルの読み取りに失敗しました。");
      reader.readAsText(file, "UTF-8");
    },
    [onImportComplete],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">
          データのバックアップ
        </h2>

        <p className="mb-4 text-sm text-zinc-400">
          選んだ映画・お気に入り・統計を JSON で保存・復元できます。
        </p>

        <p className="mb-4 text-xs text-zinc-500">{usageText}</p>

        <div className="mb-4 space-y-2">
          <button
            type="button"
            onClick={handleExport}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            データをエクスポート（ダウンロード）
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            データをインポート（復元）
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {importError && (
          <p className="mb-2 text-sm text-red-400">{importError}</p>
        )}
        {importSuccess && (
          <p className="mb-2 text-sm text-green-400">
            復元しました。画面を更新するか、一覧に戻ってご確認ください。
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-zinc-600 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
