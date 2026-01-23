"use client";

import { useEffect, useState } from "react";

// ジャンル型
type Genre = {
  id: number;
  name: string;
};

// 配信サービス型
type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

// フィルター条件の型
export type FilterOptions = {
  genres: number[]; // 選択されたジャンルID
  runtime: number | null; // 上映時間の上限（分）
  yearFrom: number | null; // リリース年の開始
  yearTo: number | null; // リリース年の終了
  providers: number[]; // 選択された配信サービスID
};

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
};

export default function FilterModal({
  isOpen,
  onClose,
  currentFilters,
  onApply,
}: FilterModalProps) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);

  // フィルター状態（モーダル内で編集中）
  const [selectedGenres, setSelectedGenres] = useState<number[]>(currentFilters.genres);
  const [selectedRuntime, setSelectedRuntime] = useState<number | null>(
    currentFilters.runtime,
  );
  const [selectedYearFrom, setSelectedYearFrom] = useState<number | null>(
    currentFilters.yearFrom,
  );
  const [selectedYearTo, setSelectedYearTo] = useState<number | null>(
    currentFilters.yearTo,
  );
  const [selectedProviders, setSelectedProviders] = useState<number[]>(
    currentFilters.providers,
  );

  // ジャンルと配信サービスを取得
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [genresRes, providersRes] = await Promise.all([
          fetch("/api/genres"),
          fetch("/api/providers"),
        ]);

        if (genresRes.ok) {
          const genresData = await genresRes.json();
          setGenres(genresData);
        }

        if (providersRes.ok) {
          const providersData = await providersRes.json();
          setProviders(providersData);
        }
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // 現在のフィルター条件を反映
  useEffect(() => {
    setSelectedGenres(currentFilters.genres);
    setSelectedRuntime(currentFilters.runtime);
    setSelectedYearFrom(currentFilters.yearFrom);
    setSelectedYearTo(currentFilters.yearTo);
    setSelectedProviders(currentFilters.providers);
  }, [currentFilters]);

  if (!isOpen) return null;

  // ジャンル選択のトグル
  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  // 配信サービス選択のトグル
  const toggleProvider = (id: number) => {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // フィルターをリセット
  const handleReset = () => {
    setSelectedGenres([]);
    setSelectedRuntime(null);
    setSelectedYearFrom(null);
    setSelectedYearTo(null);
    setSelectedProviders([]);
  };

  // フィルターを適用
  const handleApply = () => {
    onApply({
      genres: selectedGenres,
      runtime: selectedRuntime,
      yearFrom: selectedYearFrom,
      yearTo: selectedYearTo,
      providers: selectedProviders,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-zinc-900 p-6 shadow-2xl">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">フィルター</h2>
          <button
            onClick={onClose}
            className="text-2xl text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {/* ジャンル選択 */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">ジャンル</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedGenres.includes(genre.id)
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 上映時間 */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">上映時間</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "すべて", value: null },
                  { label: "90分以内", value: 90 },
                  { label: "2時間以内", value: 120 },
                  { label: "2時間半以内", value: 150 },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setSelectedRuntime(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedRuntime === option.value
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* リリース年 */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">リリース年</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "すべて", from: null, to: null },
                  { label: "2020年代", from: 2020, to: new Date().getFullYear() },
                  { label: "2010年代", from: 2010, to: 2019 },
                  { label: "2000年代", from: 2000, to: 2009 },
                  { label: "1990年代", from: 1990, to: 1999 },
                  { label: "1980年代以前", from: 1900, to: 1989 },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => {
                      setSelectedYearFrom(option.from);
                      setSelectedYearTo(option.to);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedYearFrom === option.from && selectedYearTo === option.to
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 配信サービス */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">配信サービス</h3>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => (
                  <button
                    key={provider.provider_id}
                    onClick={() => toggleProvider(provider.provider_id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      selectedProviders.includes(provider.provider_id)
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {provider.provider_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 rounded-lg bg-zinc-800 py-3 font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700"
          >
            適用する
          </button>
        </div>
      </div>
    </div>
  );
}
