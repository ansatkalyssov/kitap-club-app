import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import EditPlanForm from "@/components/clubs/EditPlanForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: club }, { data: plan }] = await Promise.all([
    supabase.from("clubs").select("id, name, facilitator_id").eq("id", id).single(),
    admin.from("club_plans").select("*, books(*)").eq("id", planId).single(),
  ]);

  if (!club || club.facilitator_id !== user.id) notFound();
  if (!plan || plan.club_id !== id) notFound();

  return (
    <div className="page-container max-w-xl">
      <Link href={`/clubs/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> {club.name}
      </Link>
      <div className="mb-6">
        <h1>Жоспарды өңдеу</h1>
        <p className="mt-1 text-sm text-gray-500">{plan.books?.title ?? "Жоспар"}</p>
      </div>
      <EditPlanForm clubId={id} plan={plan as any} />
    </div>
  );
}
