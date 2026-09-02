import Link from "next/link";
import Image from "next/image";
import { BookOpen, CheckCircle2 } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import type { ReaderRow } from "@/lib/points";

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  facilitator: "Жүргізуші",
};

export default function ReaderList({ readers }: { readers: ReaderRow[] }) {
  if (readers.length === 0) {
    return (
      <div className="card py-10 text-center text-sm text-gray-500">Оқырман жоқ</div>
    );
  }

  return (
    <div className="space-y-2">
      {readers.map((r, i) => (
        <Link
          key={r.user_id}
          href={`/readers/${r.user_id}`}
          className="card flex items-start gap-3 transition hover:border-primary-200"
        >
          <span
            className={`mt-0.5 w-5 shrink-0 text-center text-sm font-bold ${
              i < 3 ? "text-primary-600" : "text-gray-300"
            }`}
          >
            {i + 1}
          </span>

          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {r.avatar_url ? (
              <Image src={r.avatar_url} alt={r.name ?? ""} fill className="object-cover" sizes="40px" />
            ) : (
              (r.name ?? "?").charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-gray-900">{r.name ?? "Оқырман"}</p>
              {ROLE_LABELS[r.role] && (
                <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                  {ROLE_LABELS[r.role]}
                </span>
              )}
            </div>

            {r.current_book ? (
              <>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                  <BookOpen size={12} className="shrink-0 text-primary-500" />
                  <span className="truncate">{r.current_book}</span>
                </p>
                {r.current_progress !== null && (
                  <div className="mt-1.5">
                    <ProgressBar value={r.current_progress} size="sm" />
                  </div>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-gray-400">Қазір кітап оқымайды</p>
            )}

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={11} />
                {r.finished_books} кітап
              </span>
              <span>{r.total_points} ұпай</span>
              {r.clubs > 0 && <span>{r.clubs} клуб</span>}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
