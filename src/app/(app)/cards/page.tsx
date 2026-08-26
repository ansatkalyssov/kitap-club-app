import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import BookCard from "@/components/cards/BookCard";
import { getCollection, getPointsTotal, syncCards } from "@/lib/points";
import { RARITY, Rarity } from "@/lib/cards";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const total = await getPointsTotal(user.id);
  // Ашылуға тиіс карточкаларды беріп, содан кейін коллекцияны оқимыз
  await syncCards(user.id, total);
  const cards = await getCollection(user.id);

  const ownedCount = cards.filter((c) => c.owned).length;
  const nextLocked = cards
    .filter((c) => !c.owned && c.unlock_type === "threshold" && c.threshold)
    .sort((a, b) => (a.threshold ?? 0) - (b.threshold ?? 0))[0];

  const byRarity: Record<Rarity, typeof cards> = {
    legendary: [],
    epic: [],
    rare: [],
    common: [],
  };
  cards.forEach((c) => byRarity[c.rarity]?.push(c));

  return (
    <div className="page-container max-w-2xl">
      <Link
        href="/profile"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Профиль
      </Link>

      <div className="mb-5">
        <h1>Коллекция</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {ownedCount} / {cards.length} карточка ашылды
        </p>
      </div>

      {nextLocked && (
        <div className="card mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Sparkles size={16} />
          </div>
          <p className="text-sm text-gray-600">
            Келесі карточкаға{" "}
            <span className="font-semibold text-primary-600">
              {(nextLocked.threshold ?? 0) - total} ұпай
            </span>{" "}
            қалды
          </p>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card py-10 text-center text-sm text-gray-500">
          Карточкалар әзірге қосылмаған
        </div>
      ) : (
        (Object.keys(byRarity) as Rarity[])
          .filter((r) => byRarity[r].length > 0)
          .map((r) => (
            <section key={r} className="mb-7">
              <h2 className="mb-3 text-sm font-semibold text-gray-500">
                {RARITY[r].label} ({byRarity[r].filter((c) => c.owned).length}/{byRarity[r].length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {byRarity[r].map((c) => (
                  <BookCard
                    key={c.id}
                    card={c}
                    locked={!c.owned}
                    hint={c.threshold ? `${c.threshold} ұпай` : undefined}
                  />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
