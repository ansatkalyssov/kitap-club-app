import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
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
  // Пікір әрқашан нақты талқыға байланады
  if (!sp.club || !sp.plan) redirect("/clubs");
  const supabase = await createClient();

  // Пікірді клуб мүшесі де, жүргізуші де аша алады
  const [{ data: club }, { data: membership }, { data: existing }] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, name, facilitator_id, club_plans(id, month, year, books(title))")
      .eq("id", sp.club)
      .single(),
    supabase
      .from("club_members")
      .select("id")
      .eq("club_id", sp.club)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("book_analyses")
      .select("id")
      .eq("club_plan_id", sp.plan)
      .eq("author_id", user.id)
      .is("parent_id", null)
      .maybeSingle(),
  ]);

  if (!club) redirect("/clubs");
  if (club.facilitator_id !== user.id && !membership) redirect(`/clubs/${sp.club}`);

  // Бір адам — бір талқыға бір пікір. Бұрын жазған болса, соған апарамыз.
  if (existing) redirect(`/analysis/${existing.id}`);

  const clubs = [club];

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
