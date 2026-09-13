"use client";

import { useState } from "react";
import { Star, Flame, ChevronDown } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDateKz } from "@/lib/utils";
import type { PointEntry } from "@/lib/points";

interface Props {
  total: number;
  levelName: string;
  nextLevelName: string | null;
  toNext: number;
  levelProgress: number;
  streak: number;
  history: PointEntry[];
}

/**
 * Ұпай карточкасы. Ұпай тарихы бөлек бөлім емес, осының ішінде: адам
 * санды көріп, «неге сонша?» деп дәл сол жерде баса алады.
 */
export default function PointsCard({
  total,
  levelName,
  nextLevelName,
  toNext,
  levelProgress,
  streak,
  history,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card mb-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Star size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{total} ұпай</p>
            <p className="text-xs font-medium text-primary-600">{levelName}</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
            <Flame size={15} />
            {streak} күн
          </div>
        )}
      </div>

      {nextLevelName ? (
        <>
          <ProgressBar value={levelProgress} size="sm" />
          <p className="mt-1.5 text-xs text-gray-500">
            «{nextLevelName}» деңгейіне {toNext} ұпай қалды
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-500">Ең жоғары деңгейге жеттіңіз</p>
      )}

      {history.length > 0 && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex w-full items-center justify-center gap-1 border-t border-gray-50 pt-3 text-sm font-medium text-primary-600 transition hover:text-primary-700"
          >
            {open ? "Жабу" : "Ұпай тарихы"}
            <ChevronDown
              size={15}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="mt-1 divide-y divide-gray-50">
              {history.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-gray-800">
                      {e.label}
                    </span>
                    <span className="block text-xs text-gray-400">
                      {formatDateKz(e.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-primary-600">
                    +{e.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
