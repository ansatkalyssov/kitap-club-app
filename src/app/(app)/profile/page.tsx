import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import { Star, Flame, TrendingUp } from "lucide-react";
import ProfileForm from "@/components/profile/ProfileForm";
import ProgressBar from "@/components/ui/ProgressBar";
import BookCard from "@/components/cards/BookCard";
import { getUserStats, syncCards, getCollection } from "@/lib/points";
import { monthBounds } from "@/lib/utils";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { start, label } = monthBounds();
  const stats = await getUserStats(user.id, start);

  // Ашылуға тиіс карточкаларды береді — тіркелген соң бастау карточкасы
  // осы жерде беріледі, ұпай межесіне жеткендері де осында ашылады
  await syncCards(user.id, stats.total);
  const collection = await getCollection(user.id);
  const owned = collection.filter((c) => c.owned);

  // Келесі деңгейге дейінгі жол
  const span = stats.nextLevel ? stats.nextLevel.min - stats.level.min : 0;
  const done = stats.total - stats.level.min;
  const toNext = stats.nextLevel ? stats.nextLevel.min - stats.total : 0;
  const levelProgress = span > 0 ? Math.min(100, Math.round((done / span) * 100)) : 100;

  return (
    <div className="page-container max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
        <p className="mt-1 text-sm text-gray-500">Жеке ақпаратыңыз бен нәтижеңіз</p>
      </div>

      {/* Ұпай мен деңгей */}
      <div className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Star size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.total} ұпай</p>
              <p className="text-xs font-medium text-primary-600">{stats.level.name}</p>
            </div>
          </div>
          {stats.streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
              <Flame size={15} />
              {stats.streak} күн
            </div>
          )}
        </div>

        {stats.nextLevel ? (
          <>
            <ProgressBar value={levelProgress} size="sm" />
            <p className="mt-1.5 text-xs text-gray-500">
              «{stats.nextLevel.name}» деңгейіне {toNext} ұпай қалды
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500">Ең жоғары деңгейге жеттіңіз</p>
        )}
      </div>

      {/* Осы айдағы үлес */}
      <div className="card mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          <TrendingUp size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{stats.monthPoints} ұпай</p>
          <p className="text-xs text-gray-500">{label} айында жиналды</p>
        </div>
      </div>

      {/* Коллекция */}
      {collection.length > 0 && (
        <section className="mb-6">
          <div className="section-title">
            <h2>Коллекция</h2>
            <Link
              href="/cards"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              {owned.length} / {collection.length} →
            </Link>
          </div>

          {owned.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {owned.slice(0, 2).map((c) => (
                <BookCard key={c.id} card={c} />
              ))}
            </div>
          ) : (
            <div className="card py-6 text-center text-sm text-gray-500">
              Кітап оқып, алғашқы карточкаңызды ашыңыз
            </div>
          )}
        </section>
      )}

      <ProfileForm />
    </div>
  );
}
