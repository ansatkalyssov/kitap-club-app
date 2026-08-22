"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MONTHS_KZ } from "@/lib/constants";
import { RefreshCw, Plus, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  threadId: string;
  clubs: any[];
  existing: {
    club_id: string;
    club_plan_id: string | null;
    title: string;
    content: string | null;
    key_insights: string[] | null;
    meeting_date: string | null;
  };
}

export default function EditAnalysisForm({ threadId, clubs, existing }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(existing.club_plan_id || "");
  const [title, setTitle] = useState(existing.title);
  const [content, setContent] = useState(existing.content || "");
  const [meetingDate, setMeetingDate] = useState(existing.meeting_date || "");
  const [insights, setInsights] = useState<string[]>(
    existing.key_insights && existing.key_insights.length > 0 ? existing.key_insights : [""]
  );

  const club = clubs.find((c) => c.id === existing.club_id);
  const plans = club?.club_plans || [];

  function addInsight() {
    setInsights((prev) => [...prev, ""]);
  }

  function updateInsight(i: number, value: string) {
    setInsights((prev) => prev.map((ins, idx) => (idx === i ? value : ins)));
  }

  function removeInsight(i: number) {
    setInsights((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Талқы тақырыбын енгізіңіз");
      return;
    }

    const filteredInsights = insights.filter((i) => i.trim());

    setLoading(true);
    const { error } = await supabase
      .from("book_analyses")
      .update({
        club_plan_id: selectedPlan || null,
        title: title.trim(),
        content: content.trim() || null,
        key_insights: filteredInsights.length > 0 ? filteredInsights : null,
        meeting_date: meetingDate || null,
      })
      .eq("id", threadId);

    setLoading(false);
    if (error) {
      toast.error("Сақталмады: " + error.message);
      return;
    }
    toast.success("Талқы жаңартылды!");
    router.push(`/analysis/${threadId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Club (read-only) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Клуб</label>
        <input value={club?.name || ""} disabled className="input bg-gray-50 text-gray-500" />
      </div>

      {/* Plan selection */}
      {plans.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Кітап жоспары</label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="input"
          >
            <option value="">Жоспар таңдаңыз (міндетті емес)</option>
            {plans.map((p: any) => (
              <option key={p.id} value={p.id}>
                {MONTHS_KZ[p.month - 1]} — {p.books?.title || "Кітап белгіленбеген"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Meeting date */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Талқы күні</label>
        <input
          type="date"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          className="input"
        />
      </div>

      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Талқы тақырыбы <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          required
          maxLength={200}
        />
      </div>

      {/* Content */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Негізгі мазмұн</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input min-h-[200px] resize-none"
        />
      </div>

      {/* Key insights */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Маңызды инсайттар</label>
          <button type="button" onClick={addInsight} className="btn-ghost py-1 px-2 text-xs">
            <Plus size={14} /> Қосу
          </button>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={insight}
                onChange={(e) => updateInsight(i, e.target.value)}
                placeholder={`Инсайт ${i + 1}`}
                className="input flex-1"
              />
              {insights.length > 1 && (
                <button type="button" onClick={() => removeInsight(i)} className="btn-ghost p-2.5">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Link href={`/analysis/${threadId}`} className="btn-secondary flex-1">
          <ArrowLeft size={16} /> Артқа
        </Link>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading && <RefreshCw size={16} className="animate-spin" />}
          Сақтау
        </button>
      </div>
    </form>
  );
}
