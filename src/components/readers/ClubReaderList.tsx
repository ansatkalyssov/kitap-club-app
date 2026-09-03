import Link from "next/link";
import Image from "next/image";
import type { ClubReader } from "@/lib/points";

/** Клуб ішіндегі оқырмандар рейтингі. Ұпай — жалпы жиналған сан. */
export default function ClubReaderList({
  readers,
  currentUserId,
  clubId,
}: {
  readers: ClubReader[];
  currentUserId: string;
  /** Оқырман бетінен осы клубқа қайта оралу үшін */
  clubId: string;
}) {
  if (readers.length === 0) {
    return (
      <div className="card py-8 text-center text-sm text-gray-500">Оқырман жоқ</div>
    );
  }

  return (
    <div className="space-y-1.5">
      {readers.map((r, i) => {
        const isMe = r.user_id === currentUserId;
        return (
          <Link
            key={r.user_id}
            href={`/readers/${r.user_id}?from=/clubs/${clubId}`}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
              isMe
                ? "border-primary-200 bg-primary-50/50"
                : "border-gray-100 hover:border-primary-200"
            }`}
          >
            <span
              className={`w-4 shrink-0 text-center text-sm font-bold ${
                i < 3 ? "text-primary-600" : "text-gray-300"
              }`}
            >
              {i + 1}
            </span>

            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {r.avatar_url ? (
                <Image src={r.avatar_url} alt={r.name ?? ""} fill className="object-cover" sizes="32px" />
              ) : (
                (r.name ?? "?").charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {r.name ?? "Оқырман"}
              </p>
              <p className="text-[11px] text-gray-400">{r.finished_books} кітап</p>
            </div>

            <span className="shrink-0 text-sm font-bold text-primary-600">
              {r.total_points}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
