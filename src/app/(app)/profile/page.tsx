import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import { TrendingUp } from "lucide-react";
import ProfileForm from "@/components/profile/ProfileForm";
import PointsCard from "@/components/profile/PointsCard";
import RestartTourButton from "@/components/tour/RestartTourButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { getUserStats, getPointHistory } from "@/lib/points";
import { monthBounds } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { start, label } = monthBounds();
  const [stats, history] = await Promise.all([
    getUserStats(user.id, start),
    getPointHistory(user.id, 30),
  ]);

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

      <PointsCard
        total={stats.total}
        levelName={stats.level.name}
        nextLevelName={stats.nextLevel?.name ?? null}
        toNext={toNext}
        levelProgress={levelProgress}
        streak={stats.streak}
        history={history}
      />

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

      <ProfileForm />

      <div className="mt-4">
        <RestartTourButton />
      </div>
    </div>
  );
}
