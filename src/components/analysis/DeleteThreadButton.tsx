"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  threadId: string;
}

export default function DeleteThreadButton({ threadId }: Props) {
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
    router.push("/analysis");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition"
    >
      {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
      Өшіру
    </button>
  );
}
