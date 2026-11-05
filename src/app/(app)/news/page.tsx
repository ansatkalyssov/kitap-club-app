import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClubFeed, getAppFeed, mergeFeeds } from "@/lib/feed";
import { NewsList } from "@/components/dashboard/NewsFeed";

export const dynamic = "force-dynamic";

/**
 * Барлық жаңалықтар.
 *
 * Басты бетте соңғы бесеуі ғана тұрады, ал мұнда екі лента біріккен
 * толық тізім — басты беттегідей ең жаңасы жоғарыда.
 */
export default async function NewsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id);

  const clubIds = (memberships ?? []).map((m) => m.club_id);

  const [clubFeed, appFeed] = await Promise.all([
    getClubFeed(user.id, clubIds),
    getAppFeed(),
  ]);

  const news = mergeFeeds(clubFeed, appFeed, clubIds);

  return (
    <div className="page-container max-w-xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={15} />
        Басты бет
      </Link>

      <div className="mb-5 border-b-2 border-primary-900 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary-900">
          Жаңалықтар легі
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">Соңғы екі аптадағы оқиғалар</p>
      </div>

      {news.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Әзірге жаңалық жоқ</p>
      ) : (
        <NewsList items={news} />
      )}
    </div>
  );
}
