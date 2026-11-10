import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { timeAgo, type FeedItem } from "@/lib/feed";

/**
 * Жаңалықтар легі.
 *
 * Газет стилінде: карточка емес, жіңішке сызықтармен бөлінген жолдар.
 * Сондықтан лента беттің қалған бөлігінен ажырап тұрады да, «оқылатын»
 * нәрсе болып көрінеді.
 */

export function NewsList({ items }: { items: FeedItem[] }) {
  return (
    <div>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="flex gap-3 border-b border-gray-100 py-3 transition last:border-b-0 hover:bg-gray-50/70"
        >
          <span className="mt-0.5 shrink-0 text-base leading-none">{item.icon}</span>
          <div className="min-w-0 flex-1">
            {/* pre-wrap: тізім түріндегі жаңалықтың жолдары мен tab шегінісі
                сақталсын. Tab әдепкіде 8 әріптей — телефонға тым кең. */}
            <p className="whitespace-pre-wrap text-sm leading-snug text-gray-700 [tab-size:4]">
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
  items,
  showAll,
}: {
  items: FeedItem[];
  /** Басты бетте — барлық жаңалықтарға сілтеме, жаңалықтар бетінде керек емес */
  showAll?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="card mt-6">
      <div className="mb-4 flex items-baseline gap-3 border-b-2 border-primary-900 pb-2">
        <h2 className="text-lg font-extrabold tracking-tight text-primary-900">
          Жаңалықтар легі
        </h2>
      </div>

      <NewsList items={items} />

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
