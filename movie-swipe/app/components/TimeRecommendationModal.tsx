"use client";

import { type FilterOptions } from "./FilterModal";

type TimeRecommendationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
};

// 時間帯に応じたフィルター提案を取得
const getTimeRecommendation = (): {
  message: string;
  filters: FilterOptions;
} => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = 日曜日, 6 = 土曜日
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 22時以降（寝る前）
  if (hour >= 22) {
    return {
      message: "寝る前に見るなら、90分以内の軽めの映画はいかが？",
      filters: {
        genres: [],
        runtime: 90,
        yearFrom: null,
        yearTo: null,
        providers: [],
      },
    };
  }

  // 休日昼間（10時〜18時）
  if (isWeekend && hour >= 10 && hour < 18) {
    return {
      message: "時間があるなら、長めの映画も楽しめますよ",
      filters: {
        genres: [],
        runtime: null, // 制限なし
        yearFrom: null,
        yearTo: null,
        providers: [],
      },
    };
  }

  // 平日夜（18時〜22時）
  if (!isWeekend && hour >= 18 && hour < 22) {
    return {
      message: "仕事の後なら、2時間以内の映画がおすすめ",
      filters: {
        genres: [],
        runtime: 120,
        yearFrom: null,
        yearTo: null,
        providers: [],
      },
    };
  }

  // その他の時間帯（朝・昼間）
  return {
    message: "今の時間にぴったりの映画を探しましょう",
    filters: {
      genres: [],
      runtime: 120,
      yearFrom: null,
      yearTo: null,
      providers: [],
    },
  };
};

export default function TimeRecommendationModal({
  isOpen,
  onClose,
  onApply,
}: TimeRecommendationModalProps) {
  if (!isOpen) return null;

  const recommendation = getTimeRecommendation();

  const handleApply = () => {
    onApply(recommendation.filters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <h3 className="mb-2 text-xl font-bold text-white">時間帯レコメンド</h3>
          <p className="text-sm text-zinc-400">{recommendation.message}</p>
        </div>

        <div className="mb-6 rounded-lg bg-zinc-800 p-4">
          <p className="mb-2 text-sm font-semibold text-zinc-300">提案するフィルター：</p>
          <ul className="space-y-1 text-sm text-zinc-400">
            {recommendation.filters.runtime && (
              <li>• 上映時間：{recommendation.filters.runtime}分以内</li>
            )}
            {!recommendation.filters.runtime && <li>• 上映時間：制限なし</li>}
            <li>• ジャンル：すべて</li>
            <li>• リリース年：すべて</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleApply}
            className="rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-red-500"
          >
            このフィルターを適用する
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-base font-medium text-white transition-colors hover:border-zinc-600 hover:bg-zinc-700"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
