import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { Users, MapPin, Plus, Search } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import JoinClubButton from "@/components/clubs/JoinClubButton";

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const tab = sp.tab || "all";
  const q = sp.q || "";

  // All clubs
  let query = supabase
    .from("clubs")
    .select("*, cities(name), profiles(name), club_members(count)")
    .eq("is_active", true);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: allClubs } = await query.order("created_at", { ascending: false });

  // User's memberships
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id);

  const myClubIds = new Set(memberships?.map((m) => m.club_id) || []);

  // My clubs (joined)
  const myClubs = allClubs?.filter((c) => myClubIds.has(c.id)) || [];
  const otherClubs = allClubs?.filter((c) => !myClubIds.has(c.id)) || [];

  const displayClubs = tab === "my" ? myClubs : otherClubs;

  const canJoinMore = myClubIds.size < 3;

  return (
    <AppShell>
      <div className="page-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1>Клубтар</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Барлық кітап клубтары
            </p>
          </div>
          <Link href="/clubs/new" className="btn-primary">
            <Plus size={16} /> Клуб жасау
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
          {[
            { key: "all", label: `Барлығы (${otherClubs.length})` },
            { key: "my", label: `Менің клубтарым (${myClubs.length})` },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={`/clubs?tab=${key}${q ? `&q=${q}` : ""}`}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition ${
                tab === key
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form className="mb-5">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Клубты іздеу..."
              className="input pl-10"
            />
          </div>
        </form>

        {/* Club list */}
        {displayClubs.length === 0 ? (
          <EmptyState
            icon={Users}
            title={tab === "my" ? "Сіз ешбір клубқа тіркелмегенсіз" : "Клуб табылмады"}
            description={tab === "my" ? "Клубтарды шолып, тіркеліңіз" : "Іздеу нәтижесі бос"}
            action={
              tab === "my" ? (
                <Link href="/clubs?tab=all" className="btn-primary">
                  Клубтарды шолу
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayClubs.map((club: any) => {
              const isMember = myClubIds.has(club.id);
              const memberCount = club.club_members?.[0]?.count ?? 0;
              return (
                <div key={club.id} className="card flex flex-col gap-3 hover:border-primary-200 transition">
                  {/* Emblem */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 font-bold text-lg">
                      {club.emblem_url ? (
                        <img src={club.emblem_url} alt={club.name} className="h-12 w-12 rounded-xl object-cover" />
                      ) : (
                        club.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/clubs/${club.id}`} className="block font-semibold text-gray-900 hover:text-primary-700 line-clamp-1">
                        {club.name}
                      </Link>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} />
                        {club.cities?.name ?? "Қала белгіленбеген"}
                      </p>
                    </div>
                  </div>

                  {club.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{club.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={12} />
                      {memberCount} мүше
                    </span>
                    {isMember ? (
                      <span className="badge-green">Мүшесіз</span>
                    ) : (
                      <JoinClubButton
                        clubId={club.id}
                        userId={user.id}
                        disabled={!canJoinMore}
                        disabledReason={!canJoinMore ? "Ең көп 3 клубқа тіркелуге болады" : undefined}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
