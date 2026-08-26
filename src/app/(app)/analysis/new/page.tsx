import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/queries";
import CreateAnalysisForm from "@/components/analysis/CreateAnalysisForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile || profile.role === "reader") redirect("/clubs");
  // Пікір әрқашан нақты талқыға байланады
  if (!sp.club || !sp.plan) redirect("/clubs");
  const supabase = await createClient();

  // Get clubs managed by this facilitator
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, club_plans(id, month, year, books(title))")
    .eq("facilitator_id", user.id)
    .eq("is_active", true);

  return (
      <div className="page-container max-w-2xl">
        <Link
          href={`/clubs/${sp.club}/plan/${sp.plan}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} /> Талқыға оралу
        </Link>
        <div className="mb-6">
          <h1>Пікір ашу</h1>
          <p className="mt-1 text-sm text-gray-500">
            Талқы тақырыбын ашыңыз — оқырмандар өз пікірлерін қалдырады
          </p>
        </div>
        <CreateAnalysisForm
          userId={user.id}
          clubs={clubs || []}
          prefillClubId={sp.club}
          prefillPlanId={sp.plan}
        />
      </div>
  );
}
