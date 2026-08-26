import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, BookOpen, Pencil } from "lucide-react";
import ThreadList from "@/components/analysis/ThreadList";
import { formatDateKz, formatMonthKz, kzDateStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlanDiscussionPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const adminDb = createAdminClient();

  const [{ data: plan }, { data: club }, { data: membership }] = await Promise.all([
    adminDb
      .from("club_plans")
      .select("*, books(title, author, cover_url, page_count)")
      .eq("id", planId)
      .eq("club_id", id)
      .single(),
    adminDb.from("clubs").select("id, name, facilitator_id").eq("id", id).single(),
    supabase
      .from("club_members")
      .select("id")
      .eq("club_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!plan || !club) notFound();

  const isFacilitator = club.facilitator_id === user.id;
  const isMember = Boolean(membership);
  if (!isFacilitator && !isMember) redirect(`/clubs/${id}`);

  // Осы талқының пікірлері
  const { data: threads } = await supabase
    .from("book_analyses")
    .select("id, title, created_at, profiles(name)")
    .eq("club_plan_id", planId)
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  const threadIds = (threads ?? []).map((t) => t.id);
  const replyCounts: Record<string, number> = {};
  if (threadIds.length) {
    const { data: replies } = await supabase
      .from("book_analyses")
      .select("parent_id")
      .in("parent_id", threadIds);
    (replies ?? []).forEach((r) => {
      if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] ?? 0) + 1;
    });
  }

  const isPast = Boolean(plan.meeting_date && plan.meeting_date < kzDateStr());
  const book = plan.books as any;

  return (
    <div className="page-container max-w-2xl">
      <Link
        href={`/clubs/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> {club.name}
      </Link>

      {/* Талқы туралы */}
      <div className="card mb-5">
        <div className="flex items-start gap-4">
          {book?.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              width={52}
              height={76}
              className="h-[76px] w-13 shrink-0 rounded-lg border border-gray-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-[76px] w-13 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-primary-50">
              <BookOpen size={20} className="text-primary-300" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary-600">
                  {formatMonthKz(plan.month, plan.year)}
                  {isPast && " · архив"}
                </p>
                <h1 className="mt-0.5 text-lg font-bold text-gray-900">
                  {book?.title ?? "Кітап белгіленбеген"}
                </h1>
                {book?.author && <p className="text-sm text-gray-500">{book.author}</p>}
              </div>
              {isFacilitator && (
                <Link
                  href={`/clubs/${id}/plan/${planId}/edit`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
                >
                  <Pencil size={12} /> Өңдеу
                </Link>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
              {plan.meeting_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {formatDateKz(plan.meeting_date)}
                </span>
              )}
              {plan.meeting_location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {plan.meeting_location}
                </span>
              )}
            </div>
          </div>
        </div>

        {plan.notes && (
          <p className="mt-4 border-t border-gray-50 pt-3 text-sm text-gray-600">{plan.notes}</p>
        )}
      </div>

      {/* Пікірлер */}
      <div className="section-title">
        <h2>Пікірлер ({threads?.length ?? 0})</h2>
      </div>

      <ThreadList
        threads={(threads ?? []) as any}
        replyCounts={replyCounts}
        newHref={isFacilitator ? `/analysis/new?club=${id}&plan=${planId}` : undefined}
        emptyText={
          isPast
            ? "Бұл талқыда пікір жазылмаған"
            : "Әзірге пікір жоқ. Кітапты оқып, ойыңызбен бөлісіңіз."
        }
      />
    </div>
  );
}
