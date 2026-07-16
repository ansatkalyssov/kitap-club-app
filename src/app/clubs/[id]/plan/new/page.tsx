import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import AddPlanForm from "@/components/clubs/AddPlanForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, facilitator_id")
    .eq("id", id)
    .single();

  if (!club || club.facilitator_id !== user.id) notFound();

  return (
    <AppShell>
      <div className="page-container max-w-xl">
        <Link href={`/clubs/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> {club.name}
        </Link>
        <div className="mb-6">
          <h1>Жоспар қосу</h1>
          <p className="mt-1 text-sm text-gray-500">Айлық кітап жоспары</p>
        </div>
        <AddPlanForm clubId={id} />
      </div>
    </AppShell>
  );
}
