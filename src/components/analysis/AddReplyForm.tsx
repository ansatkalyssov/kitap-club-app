"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Send } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  threadId: string;
  clubId: string;
  userId: string;
  userInitial: string;
}

export default function AddReplyForm({ threadId, clubId, userId, userInitial }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Пікіріңізді жазыңыз");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("book_analyses").insert({
      parent_id: threadId,
      club_id: clubId,
      author_id: userId,
      title: "",
      content: content.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error("Сақталмады: " + error.message);
      return;
    }
    toast.success("Пікір қосылды!");
    setContent("");
    setFocused(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={`rounded-2xl border transition-all ${
        focused ? "border-primary-300 bg-white shadow-sm" : "border-dashed border-gray-200 bg-gray-50"
      }`}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Пікіріңізді жазыңыз..."
          className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none"
          rows={focused ? 4 : 2}
        />
        {focused && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2.5">
            <button
              type="button"
              onClick={() => { setFocused(false); setContent(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Бас тарту
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="btn-primary py-1.5 px-4 text-xs disabled:opacity-50"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              Жіберу
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
