"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, Check, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  replyId: string;
  content: string | null;
  canEdit: boolean;
  canDelete: boolean;
}

export default function ReplyContent({ replyId, content, canEdit, canDelete }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (!draft.trim()) {
      toast.error("Пікір бос болмауы керек");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("book_analyses")
      .update({ content: draft.trim() })
      .eq("id", replyId);
    setSaving(false);
    if (error) {
      toast.error("Сақталмады");
      return;
    }
    toast.success("Пікір жаңартылды");
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm("Пікірді өшіресіз бе?")) return;
    setDeleting(true);
    const { error } = await supabase
      .from("book_analyses")
      .delete()
      .eq("id", replyId);
    setDeleting(false);
    if (error) {
      toast.error("Өшірілмеді");
      return;
    }
    toast.success("Пікір өшірілді");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="mt-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full resize-none rounded-xl border border-primary-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-primary-200"
          rows={4}
          autoFocus
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { setEditing(false); setDraft(content || ""); }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition"
          >
            <X size={13} /> Бас тарту
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            Сақтау
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {content && (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-14">
          {content}
        </p>
      )}
      {(canEdit || canDelete) && (
        <div className="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition"
              title="Өңдеу"
            >
              <Pencil size={12} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
              title="Өшіру"
            >
              {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
