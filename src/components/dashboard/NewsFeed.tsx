import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { timeAgo, type FeedItem } from "@/lib/feed";

/**
 * Жаңалықтар легі.
 *
 * Газет стилінде: карточка емес, жіңішке сызықтармен бөлінген жолдар,
 * бөлімнің аты ұсақ әріппен жазылып, бойлық сызықпен созылады. Сондықтан
 * лента беттің қалған бөлігінен ажырап тұрады да, «оқылатын» нәрсе болып
 * көрінеді.
 */

export function NewsSection({
  label,
  items,
}: {
  label: string;
  items: FeedItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-1 flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
          {label}
        </span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex gap-3 border-b border-gray-100 py-3 transition last:border-b-0 hover:bg-gray-50/70"
        >
          <span className="mt-0.5 shrink-0 text-base leading-none">{item.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-gray-700">
              <span className="font-semibold text-gray-900">{item.lead}</span>
              {item.rest}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
              {timeAgo(item.at)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function NewsFeed({
  club,
  app,
  showAll,
}: {
  club: FeedItem[];
  app: FeedItem[];
  /** Басты бетте — барлық жаңалықтарға сілтеме, жаңалықтар бетінде керек емес */
  showAll?: boolean;
}) {
  if (club.length === 0 && app.length === 0) return null;

  return (
    <section className="card mt-6">
      <div className="mb-4 flex items-baseline gap-3 border-b-2 border-primary-900 pb-2">
        <h2 className="text-lg font-extrabold tracking-tight text-primary-900">
          Жаңалықтар легі
        </h2>
      </div>

      <NewsSection label="Клубта" items={club} />
      <NewsSection label="Oqyrman-да" items={app} />

      {showAll && (
        <Link
          href="/news"
          className="mt-4 flex items-center justify-center gap-1.5 border-t border-gray-100 pt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Барлық жаңалықтар <ArrowRight size={14} />
        </Link>
      )}
    </section>
  );
}
