import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/queries";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, BookOpen } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminDb = createAdminClient();
  const { data: club } = await adminDb
    .from("clubs")
    .select("name, description, emblem_url, cities(name)")
    .eq("id", id)
    .single();

  if (!club) return {};

  const title = club.name;
  const description = club.description || `Кітап клубы — ${(club.cities as any)?.name ?? ""}`;
  const image = club.emblem_url || null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image, width: 400, height: 400 }] } : {}),
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PublicClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();

  if (user) redirect(`/clubs/${id}`);

  const adminDb = createAdminClient();
  const [{ data: club }, { count: memberCount }, { data: plans }] = await Promise.all([
    adminDb.from("clubs").select("*, cities(name), profiles(name)").eq("id", id).single(),
    adminDb.from("club_members").select("id", { count: "exact" }).eq("club_id", id),
    adminDb
      .from("club_plans")
      .select("*, books(title, cover_url, author)")
      .eq("club_id", id)
      .order("meeting_date", { ascending: true, nullsFirst: false })
      .limit(3),
  ]);

  if (!club) notFound();

  const today = new Date().toISOString().split("T")[0];
  const nearestPlan =
    (plans || []).find((p) => !p.meeting_date || p.meeting_date >= today) ?? null;

  return (
    <main className="flex min-h-screen items-start justify-center bg-gray-50 px-4 pt-12 pb-16">
      <div className="w-full max-w-sm">
        {/* Club card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-2xl font-bold overflow-hidden">
              {club.emblem_url ? (
                <Image
                  src={club.emblem_url}
                  alt={club.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                club.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900">{club.name}</h1>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                {club.cities && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {(club.cities as any).name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} /> {memberCount} оқырман
                </span>
              </div>
              {club.description && (
                <p className="mt-2 text-sm text-gray-600">{club.description}</p>
              )}
            </div>
          </div>

          {nearestPlan?.books && (
            <div className="flex items-center gap-3 rounded-xl bg-primary-50 p-3">
              {nearestPlan.books.cover_url && (
                <Image
                  src={nearestPlan.books.cover_url}
                  alt={nearestPlan.books.title}
                  width={36}
                  height={52}
                  className="h-14 w-9 rounded-lg object-cover border border-gray-200 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary-600 flex items-center gap-1">
                  <BookOpen size={11} /> Қазіргі кітап
                </p>
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                  {nearestPlan.books.title}
                </p>
                {nearestPlan.books.author && (
                  <p className="text-xs text-gray-500">{nearestPlan.books.author}</p>
                )}
              </div>
            </div>
          )}

          <Link
            href={`/login?next=/clubs/${id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-95"
          >
            Клубқа қосылу
          </Link>
          <p className="text-center text-xs text-gray-400">
            Тіркелу тегін және жылдам
          </p>
        </div>
      </div>
    </main>
  );
}
