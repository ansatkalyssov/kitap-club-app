import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EditTrackerForm from "@/components/tracker/EditTrackerForm";

export default async function EditTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: tracker } = await supabase
    .from("book_trackers")
    .select("id, book_title, book_author, total_pages, deadline, cover_url, user_id")
    .eq("id", id)
    .single();

  if (!tracker || tracker.user_id !== user.id) notFound();

  return (
    <div className="page-container max-w-lg">
      <Link
        href={`/tracker/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Трекер
      </Link>

      <h1 className="mb-5">Трекерді өңдеу</h1>

      <EditTrackerForm
        trackerId={id}
        existing={{
          book_title: tracker.book_title,
          book_author: tracker.book_author,
          total_pages: tracker.total_pages,
          deadline: tracker.deadline,
          cover_url: tracker.cover_url ?? null,
        }}
      />
    </div>
  );
}
