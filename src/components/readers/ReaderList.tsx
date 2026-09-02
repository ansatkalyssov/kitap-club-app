import Link from "next/link";
import Image from "next/image";
import type { ReaderRow } from "@/lib/points";

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
          className="card flex items-center gap-3 transition hover:border-primary-200"
        >
          <span
            className={`w-5 shrink-0 text-center text-sm font-bold ${
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
            <p className="truncate font-semibold text-gray-900">{r.name ?? "Оқырман"}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {r.finished_books} кітап
              {r.clubs > 0 && ` · ${r.clubs} клуб`}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-bold leading-none text-primary-600">
              {r.total_points}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">ұпай</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
