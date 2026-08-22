import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import EditAnalysisForm from "@/components/analysis/EditAnalysisForm";

export default async function EditAnalysisPage({
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
    .select("*")
    .eq("id", id)
    .is("parent_id", null)
    .single();

  if (!thread) notFound();
  if (thread.author_id !== user.id) redirect(`/analysis/${id}`);

  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, clubs(id, name, club_plans(id, month, year, books(title)))")
    .eq("user_id", user.id);

  const { data: facilitatedClubs } = await supabase
    .from("clubs")
    .select("id, name, club_plans(id, month, year, books(title))")
    .eq("facilitator_id", user.id)
    .eq("is_active", true);

  const memberClubs = (memberships || []).map((m: any) => m.clubs).filter(Boolean);
  const allClubs = [
    ...(facilitatedClubs || []),
    ...memberClubs.filter((c: any) => !(facilitatedClubs || []).find((f) => f.id === c.id)),
  ];

  return (
    <div className="page-container max-w-xl">
      <div className="mb-6">
        <h1>Талқыны өңдеу</h1>
        <p className="mt-1 text-sm text-gray-500">{thread.title}</p>
      </div>
      <EditAnalysisForm
        threadId={id}
        clubs={allClubs}
        existing={{
          club_id: thread.club_id,
          club_plan_id: thread.club_plan_id,
          title: thread.title,
          content: thread.content,
          key_insights: thread.key_insights,
          meeting_date: thread.meeting_date,
        }}
      />
    </div>
  );
}
