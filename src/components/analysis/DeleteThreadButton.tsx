"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  threadId: string;
  /** Өшірген соң қайда ораламыз — әдетте талқы беті */
  backHref?: string;
}

export default function DeleteThreadButton({ threadId, backHref }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Талқыны өшіресіз бе? Барлық пікірлер де өшіріледі.")) return;
    setDeleting(true);
    const { error } = await supabase
      .from("book_analyses")
      .delete()
      .eq("id", threadId);
    setDeleting(false);
    if (error) {
      toast.error("Өшірілмеді");
      return;
    }
    toast.success("Талқы өшірілді");
    router.push(backHref ?? "/clubs");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Өшіру"
      title="Өшіру"
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
    >
      {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
    </button>
  );
}
