import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, CheckCircle2, Star, Users } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { getReaderBooks, getPointsTotal, levelFor } from "@/lib/points";
import { formatDateKz } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const adminDb = createAdminClient();

  // Қайдан келгені URL арқылы беріледі. Сыртқы адреске сілтеп кетпеу үшін
  // тек ішкі жол қабылданады.
  const safeFrom = from?.startsWith("/") && !from.startsWith("//") ? from : null;
  const fromClub = safeFrom?.match(/^\/clubs\/([0-9a-f-]{36})$/i)?.[1] ?? null;

  const { data: backClub } = fromClub
    ? await adminDb.from("clubs").select("name").eq("id", fromClub).single()
    : { data: null };

  const back = safeFrom
    ? { href: safeFrom, label: backClub?.name ?? "Артқа" }
    : { href: "/rating?tab=readers", label: "Оқырмандар" };

  const [{ data: profile }, books, points, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar_url, role").eq("id", id).single(),
    getReaderBooks(id),
    getPointsTotal(id),
    adminDb.from("club_members").select("clubs(id, name)").eq("user_id", id),
  ]);

  if (!profile) notFound();

  const reading = books.filter((b) => !b.is_completed);
  const finished = books.filter((b) => b.is_completed);
  const level = levelFor(points).current;
  const isMe = profile.id === user.id;

  return (
    <div className="page-container max-w-xl">
      <Link
        href={back.href}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> {back.label}
      </Link>

      {/* Оқырман */}
      <div className="card mb-5 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xl font-bold text-primary-700">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.name ?? ""} fill className="object-cover" sizes="64px" />
          ) : (
            (profile.name ?? "?").charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-gray-900">
            {profile.name ?? "Оқырман"}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-medium text-primary-600">
              <Star size={12} /> {points} ұпай · {level.name}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} /> {finished.length} кітап
            </span>
          </p>
        </div>

        {isMe && (
          <Link href="/profile" className="shrink-0 text-xs font-medium text-primary-600">
            Өңдеу
          </Link>
        )}
      </div>

      {/* Клубтар */}
      {memberships && memberships.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {(memberships as any[]).map((m) => (
            <Link
              key={m.clubs?.id}
              href={`/clubs/${m.clubs?.id}`}
              className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
            >
              <Users size={12} />
              {m.clubs?.name}
            </Link>
          ))}
        </div>
      )}

      {/* Оқып жатыр */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">
          Қазір оқып жатыр ({reading.length})
        </h2>

        {reading.length > 0 ? (
          <div className="space-y-2">
            {reading.map((b) => (
              <div key={b.tracker_id} className="card flex items-start gap-3">
                <Cover url={b.cover_url} title={b.book_title} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold text-gray-900">{b.book_title}</p>
                  {b.book_author && <p className="text-xs text-gray-500">{b.book_author}</p>}
                  {b.club_name && (
                    <p className="mt-0.5 text-[11px] text-primary-600">{b.club_name}</p>
                  )}
                  <div className="mt-2">
                    <ProgressBar value={b.progress} size="sm" />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {b.progress}%
                    {b.deadline && ` · дедлайн ${formatDateKz(b.deadline)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-6 text-center text-sm text-gray-500">
            Қазір оқып жатқан кітабы жоқ
          </div>
        )}
      </section>

      {/* Сөре */}
      {finished.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            Оқып бітірген ({finished.length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {finished.map((b) => (
              <div key={b.tracker_id} className="flex flex-col items-center gap-2 text-center">
                <Cover url={b.cover_url} title={b.book_title} large />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-medium text-gray-800">
                    {b.book_title}
                  </p>
                  {b.book_author && (
                    <p className="line-clamp-1 text-[10px] text-gray-400">{b.book_author}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Cover({ url, title, large }: { url: string | null; title: string; large?: boolean }) {
  const size = large ? "h-28 w-20" : "h-16 w-11";
  if (url) {
    return (
      <Image
        src={url}
        alt={title}
        width={large ? 80 : 44}
        height={large ? 112 : 64}
        className={`${size} shrink-0 rounded-lg border border-gray-200 object-cover shadow-sm`}
      />
    );
  }
  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-primary-50`}
    >
      <BookOpen size={large ? 22 : 18} className="text-primary-300" />
    </div>
  );
}
