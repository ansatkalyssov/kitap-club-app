import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import CreateTrackerForm from "@/components/tracker/CreateTrackerForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    book?: string;
    title?: string;
    pages?: string;
    author?: string;
    deadline?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <div className="page-container max-w-xl">
        <Link href="/tracker" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Трекер
        </Link>
        <div className="mb-6">
          <h1>Жаңа трекер</h1>
          <p className="mt-1 text-sm text-gray-500">Кітап оқу жоспарын жасаңыз</p>
        </div>
        <CreateTrackerForm
          userId={user.id}
          prefill={{
            planId: sp.plan,
            bookId: sp.book,
            title: sp.title ? decodeURIComponent(sp.title) : undefined,
            pages: sp.pages,
            author: sp.author ? decodeURIComponent(sp.author) : undefined,
            deadline: sp.deadline,
          }}
        />
      </div>
    </AppShell>
  );
}
