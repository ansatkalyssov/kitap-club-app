import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import { MessageSquare, Calendar, BookOpen, ChevronRight, Plus } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateKz } from "@/lib/utils";

export default async function AnalysisPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  // Parallel: memberships + managedClubs
  const [{ data: memberships }, { data: managedClubs }] = await Promise.all([
    supabase.from("club_members").select("club_id").eq("user_id", user.id),
    supabase.from("clubs").select("id").eq("facilitator_id", user.id),
  ]);

  const allClubIds = Array.from(
    new Set([
      ...(memberships || []).map((m) => m.club_id),
      ...(managedClubs || []).map((c) => c.id),
    ])
  );

  // All top-level threads from user's clubs
  const { data: threads } = allClubIds.length
    ? await supabase
        .from("book_analyses")
        .select("*, clubs(name), club_plans(books(title, author)), profiles(name)")
        .in("club_id", allClubIds)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
    : { data: [] };

  const threadIds = (threads || []).map((t) => t.id);

  // User's replies (to know which threads they participated in)
  const { data: userReplies } = threadIds.length
    ? await supabase
        .from("book_analyses")
        .select("parent_id, content")
        .eq("author_id", user.id)
        .in("parent_id", threadIds)
    : { data: [] };

  // Latest reply date per thread (for sorting by last activity)
  const { data: replyActivity } = threadIds.length
    ? await supabase
        .from("book_analyses")
        .select("parent_id, created_at")
        .in("parent_id", threadIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Reply counts per thread
  const replyCountMap: Record<string, number> = {};
  const lastActivityMap: Record<string, string> = {};
  (replyActivity || []).forEach((r) => {
    if (!r.parent_id) return;
    replyCountMap[r.parent_id] = (replyCountMap[r.parent_id] || 0) + 1;
    if (!lastActivityMap[r.parent_id]) lastActivityMap[r.parent_id] = r.created_at;
  });

  // Map threadId → user's reply content
  const userReplyMap: Record<string, string> = {};
  (userReplies || []).forEach((r) => {
    if (r.parent_id) userReplyMap[r.parent_id] = r.content || "";
  });

  // Sort by last activity (last reply date, or thread creation if no replies)
  const sorted = [...(threads || [])].sort((a, b) => {
    const aDate = lastActivityMap[a.id] || a.created_at;
    const bDate = lastActivityMap[b.id] || b.created_at;
    return bDate.localeCompare(aDate);
  });

  return (
      <div className="page-container max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1>Пікір алмасу</h1>
            <p className="mt-0.5 text-sm text-gray-500">Клубтардың талқы пікірлері</p>
          </div>
          {managedClubs && managedClubs.length > 0 && (
            <Link href="/analysis/new" className="btn-primary py-1.5 px-3 text-sm">
              <Plus size={15} /> Пікір ашу
            </Link>
          )}
        </div>

        {sorted.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Пікір жоқ"
            description="Клубыңыздың кітап талқысына пікір қалдырыңыз"
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                userId={user.id}
                myReply={userReplyMap[t.id]}
                replyCount={replyCountMap[t.id] || 0}
              />
            ))}
          </div>
        )}
      </div>
  );
}

function ThreadCard({
  thread,
  userId,
  myReply,
  replyCount,
}: {
  thread: any;
  userId: string;
  myReply?: string;
  replyCount: number;
}) {
  const isAuthor = thread.author_id === userId;

  return (
    <Link
      href={`/analysis/${thread.id}`}
      className="group block rounded-2xl border border-gray-200 bg-white p-5 hover:border-primary-400 hover:shadow-md transition"
    >
      {/* Title */}
      <p className="mb-1.5 text-base font-bold text-gray-900 line-clamp-2 group-hover:text-primary-700 transition">
        {thread.title}
      </p>

      {/* Club + date */}
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-primary-600">{thread.clubs?.name}</span>
        {thread.meeting_date && (
          <>
            <span className="text-gray-400">·</span>
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar size={10} />
              {formatDateKz(thread.meeting_date)}
            </span>
          </>
        )}
      </div>

      {/* Book */}
      {thread.club_plans?.books && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
          <BookOpen size={11} className="shrink-0" />
          <span className="line-clamp-1 font-medium">
            {thread.club_plans.books.title}
            {thread.club_plans.books.author && (
              <span className="font-normal text-gray-400"> — {thread.club_plans.books.author}</span>
            )}
          </span>
        </div>
      )}

      {/* Opener */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-[10px]">
          {(thread.profiles?.name || "?").charAt(0).toUpperCase()}
        </div>
        <span className="font-medium">{thread.profiles?.name}</span>
        <span className="text-gray-300">·</span>
        <span>жүргізуші</span>
      </div>

      {/* Reply preview */}
      {(myReply || isAuthor) && (
        <>
          <div className="my-3 border-t border-gray-200" />
          <p className="text-sm text-gray-500 line-clamp-1">
            {myReply ? (
              <><span className="font-semibold text-gray-700">Сіз: </span>{myReply}</>
            ) : (
              <span className="italic text-gray-400">Сіз бұл пікірді аштыңыз</span>
            )}
          </p>
        </>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <MessageSquare size={12} />
          <span className="font-medium">{replyCount} пікір</span>
        </div>
        <ChevronRight size={15} className="text-gray-400 group-hover:text-primary-500 transition" />
      </div>
    </Link>
  );
}
