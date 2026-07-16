import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/lib/queries";
import Link from "next/link";
import { ArrowLeft, Calendar, BookOpen, MessageSquare } from "lucide-react";
import { formatDateKz, formatMonthKz } from "@/lib/utils";
import AddReplyForm from "@/components/analysis/AddReplyForm";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("book_analyses")
    .select("*, clubs(name, facilitator_id), club_plans(month, year, books(title, author, page_count)), profiles(name)")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  // Parallel: replies + profile + membership
  const [{ data: repliesRaw }, profile, { data: membership }] = await Promise.all([
    supabase.from("book_analyses").select("*, profiles(name)").eq("parent_id", id).order("created_at", { ascending: true }),
    getProfile(),
    supabase.from("club_members").select("id").eq("club_id", thread.club_id).eq("user_id", user.id).single(),
  ]);
  const replies = repliesRaw || [];

  const clubs = thread.clubs as any;
  const clubPlan = thread.club_plans as any;
  const book = clubPlan?.books;

  const isFacilitator = clubs?.facilitator_id === user.id;

  const canReply = isFacilitator || !!membership;
  const userReply = (replies || []).find((r) => r.author_id === user.id);
  const userInitial = (profile?.name || user.email || "?").charAt(0).toUpperCase();

  return (
      <div className="page-container max-w-2xl">
        <Link
          href="/analysis"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} /> Пікір алмасу
        </Link>

        {/* Thread header */}
        <div className="mb-6 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/60 to-white p-5 shadow-sm">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{thread.title}</h1>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-primary-600">{clubs?.name}</span>
            {thread.meeting_date && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1 text-gray-500">
                  <Calendar size={12} />
                  {formatDateKz(thread.meeting_date)}
                </span>
              </>
            )}
          </div>

          {/* Thread author */}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-[11px]">
              {((thread.profiles as any)?.name || "?").charAt(0).toUpperCase()}
            </div>
            <span>{(thread.profiles as any)?.name}</span>
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">жүргізуші</span>
          </div>

          {/* Book */}
          {book && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-gray-100">
              <BookOpen size={18} className="shrink-0 text-primary-500" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{book.title}</p>
                <div className="flex gap-2 text-xs text-gray-400">
                  {book.author && <span>{book.author}</span>}
                  {book.page_count && <span>· {book.page_count} бет</span>}
                  {clubPlan && <span>· {formatMonthKz(clubPlan.month, clubPlan.year)}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Thread content / description */}
          {thread.content && (
            <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border-t border-primary-100/60 pt-4">
              {thread.content}
            </div>
          )}

          {/* Key insights */}
          {thread.key_insights && (thread.key_insights as string[]).length > 0 && (
            <ul className="mt-3 space-y-2">
              {(thread.key_insights as string[]).map((ins, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {i + 1}
                  </span>
                  {ins}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Replies section */}
        <div className="mb-5 flex items-center gap-2">
          <MessageSquare size={17} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-700">
            Пікірлер ({(replies || []).length})
          </h2>
        </div>

        {/* Branch thread */}
        <div className="relative">
          {/* Vertical branch line */}
          {(replies && replies.length > 0) && (
            <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-100" />
          )}

          <div className="space-y-3">
            {(replies || []).map((reply: any, idx) => {
              const isMe = reply.author_id === user.id;
              const isFacRep = reply.author_id === clubs?.facilitator_id;
              const initial = ((reply.profiles as any)?.name || "?").charAt(0).toUpperCase();
              const isLast = idx === (replies || []).length - 1;

              return (
                <div key={reply.id} className="relative flex gap-3">
                  {/* Avatar node */}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-sm ${
                      isMe
                        ? "bg-primary-500 text-white"
                        : isFacRep
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {initial}
                  </div>

                  {/* Reply card */}
                  <div
                    className={`flex-1 rounded-2xl border p-4 shadow-sm ${
                      isMe
                        ? "border-primary-200 bg-primary-50/40"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">
                        {(reply.profiles as any)?.name || "Пайдаланушы"}
                      </span>
                      {isFacRep && (
                        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                          жүргізуші
                        </span>
                      )}
                      {isMe && (
                        <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-medium text-white">
                          сіз
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(reply.created_at).toLocaleDateString("kk-KZ", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    {reply.content && (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    )}

                    {reply.key_insights && (reply.key_insights as string[]).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {(reply.key_insights as string[]).map((ins: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500">
                              {i + 1}
                            </span>
                            {ins}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add reply row */}
            {canReply && !userReply && (
              <div className="relative flex gap-3">
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-bold border-2 border-primary-200 border-dashed">
                  {userInitial}
                </div>
                <div className="flex-1">
                  <AddReplyForm
                    threadId={id}
                    clubId={thread.club_id}
                    userId={user.id}
                    userInitial={userInitial}
                  />
                </div>
              </div>
            )}

            {canReply && userReply && (
              <p className="pl-11 text-xs text-gray-400">
                ✓ Сіз бұл талқыға пікіріңізді қалдырдыңыз
              </p>
            )}

            {!canReply && (
              <p className="py-6 text-center text-sm text-gray-400">
                Пікір қалдыру үшін клубқа қосылыңыз
              </p>
            )}
          </div>
        </div>
      </div>
  );
}
