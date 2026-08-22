import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import EditClubForm from "@/components/clubs/EditClubForm";

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const [{ data: club }, { data: cities }] = await Promise.all([
    supabase.from("clubs").select("*").eq("id", id).single(),
    supabase.from("cities").select("*").order("name"),
  ]);

  if (!club) notFound();
  if (club.facilitator_id !== user.id) redirect(`/clubs/${id}`);

  return (
    <div className="page-container max-w-xl">
      <div className="mb-6">
        <h1>Клубты өңдеу</h1>
        <p className="mt-1 text-sm text-gray-500">{club.name}</p>
      </div>
      <EditClubForm
        clubId={id}
        userId={user.id}
        cities={cities || []}
        existing={{
          name: club.name,
          description: club.description,
          city_id: club.city_id,
          emblem_url: club.emblem_url,
        }}
      />
    </div>
  );
}
