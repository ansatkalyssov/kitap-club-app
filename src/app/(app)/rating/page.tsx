import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Users, BookOpen } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { getClubLeaderboard } from "@/lib/points";
import { monthBounds } from "@/lib/utils";

export default async function RatingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { start, end, label } = monthBounds();

  const [rows, { data: memberships }] = await Promise.all([
    getClubLeaderboard(start, end),
    supabase.from("club_members").select("club_id").eq("user_id", user.id),
  ]);

  const myClubIds = new Set((memberships ?? []).map((m) => m.club_id));
  const ranked = rows.filter((r) => r.total_points > 0);
  const unranked = rows.filter((r) => r.total_points === 0);

  const medal = (i: number) =>
    i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-200 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400";

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1>Рейтиң</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Клубтардың {label} айындағы оқу белсенділігі
        </p>
      </div>

      {ranked.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Рейтиң әлі бос"
          description="Осы айда ешкім ұпай жинамаған. Кітап оқып, бірінші болыңыз!"
          action={
            <Link href="/reading-plan" className="btn-primary">
              <BookOpen size={16} /> Оқуды бастау
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {ranked.map((r, i) => {
            const isMine = myClubIds.has(r.club_id);
            return (
              <Link
                key={r.club_id}
                href={`/clubs/${r.club_id}`}
                className={`card flex items-center gap-3 transition hover:border-primary-200 ${
                  isMine ? "border-primary-200 bg-primary-50/40" : ""
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${medal(i)}`}
                >
                  {i + 1}
                </div>

                {r.emblem_url ? (
                  <Image
                    src={r.emblem_url}
                    alt={r.club_name}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                    <Users size={16} className="text-primary-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">
                    {r.club_name}
                    {isMine && (
                      <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                        Менің клубым
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.member_count} мүше · орташа {r.avg_points}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-bold text-primary-600">{r.total_points}</p>
                  <p className="text-[10px] text-gray-400">ұпай</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {unranked.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            Осы айда белсенділік жоқ ({unranked.length})
          </h2>
          <div className="space-y-1.5">
            {unranked.map((r) => (
              <Link
                key={r.club_id}
                href={`/clubs/${r.club_id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition hover:border-gray-200"
              >
                <Users size={14} className="shrink-0 text-gray-300" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{r.club_name}</span>
                <span className="shrink-0 text-xs text-gray-400">{r.member_count} мүше</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        Рейтиң мүшелердің оқудан жинаған ұпайынан құралады.
        <br />
        Әр айдың басында нөлден басталады.
      </p>
    </div>
  );
}
