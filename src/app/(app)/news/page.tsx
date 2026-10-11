import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUser, getProfile } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClubFeed, getAppFeed } from "@/lib/feed";
import { isPreviewUser } from "@/lib/preview";
import { NewsSection } from "@/components/dashboard/NewsFeed";

export const dynamic = "force-dynamic";

/**
 * Барлық жаңалықтар.
 *
 * Басты беттегі лента үшеу-үштен ғана көрсетеді, ал мұнда екі ленталың
 * толық тізімі тұрады. Бөлінуі де сол — алдымен өз клубыңдағы оқиғалар,
 * содан кейін қолданбадағы қалған жаңалықтар.
 */
export default async function NewsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile || !isPreviewUser(profile.email)) redirect("/dashboard");

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

  const appNews = appFeed
    .filter((a) => !a.clubId || !clubIds.includes(a.clubId))
    .filter((a) => !clubFeed.some((c) => c.id === a.id));

  const empty = clubFeed.length === 0 && appNews.length === 0;

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

      {empty ? (
        <p className="py-10 text-center text-sm text-gray-400">Әзірге жаңалық жоқ</p>
      ) : (
        <>
          <NewsSection label="Клубта" items={clubFeed} />
          <NewsSection label="Oqyrman-да" items={appNews} />
        </>
      )}
    </div>
  );
}
