import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CreateClubForm from "@/components/clubs/CreateClubForm";

export default async function NewClubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cities } = await supabase.from("cities").select("*").order("name");

  return (
    <AppShell>
      <div className="page-container max-w-xl">
        <div className="mb-6">
          <h1>Клуб жасау</h1>
          <p className="mt-1 text-sm text-gray-500">Жаңа кітап клубы</p>
        </div>
        <CreateClubForm userId={user.id} cities={cities || []} />
      </div>
    </AppShell>
  );
}
