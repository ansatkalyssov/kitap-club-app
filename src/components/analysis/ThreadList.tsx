import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { formatDateKz } from "@/lib/utils";

export type Thread = {
  id: string;
  title: string;
  created_at: string;
  profiles?: { name: string | null } | null;
};

interface Props {
  threads: Thread[];
  replyCounts: Record<string, number>;
  /** Жаңа пікір ашу сілтемесі. Берілмесе батырма көрсетілмейді. */
  newHref?: string;
  emptyText?: string;
}

export default function ThreadList({ threads, replyCounts, newHref, emptyText }: Props) {
  return (
    <div>
      {newHref && (
        <Link
          href={newHref}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 py-2.5 text-xs font-medium text-gray-500 transition hover:border-primary-300 hover:text-primary-600"
        >
          <Plus size={14} /> Пікір ашу
        </Link>
      )}

      {threads.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          {emptyText ?? "Бұл талқыда әзірге пікір жоқ"}
        </p>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/analysis/${t.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary-200 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-gray-900">{t.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {t.profiles?.name ?? "Оқырман"} · {formatDateKz(t.created_at.split("T")[0])}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                <MessageSquare size={12} />
                {replyCounts[t.id] ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
