"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MONTHS_KZ } from "@/lib/constants";
import { RefreshCw, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  userId: string;
  clubs: any[];
  prefillClubId?: string;
  prefillPlanId?: string;
}

export default function CreateAnalysisForm({ userId, clubs, prefillClubId, prefillPlanId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [selectedClub, setSelectedClub] = useState(prefillClubId || "");
  const [selectedPlan, setSelectedPlan] = useState(prefillPlanId || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [insights, setInsights] = useState<string[]>([""]);

  const club = clubs.find((c) => c.id === selectedClub);
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
    if (!selectedClub) {
      toast.error("Клубты таңдаңыз");
      return;
    }
    if (!title.trim()) {
      toast.error("Талқы тақырыбын енгізіңіз");
      return;
    }

    const filteredInsights = insights.filter((i) => i.trim());

    setLoading(true);
    const { data, error } = await supabase
      .from("book_analyses")
      .insert({
        club_id: selectedClub,
        club_plan_id: selectedPlan || null,
        author_id: userId,
        title: title.trim(),
        content: content.trim() || null,
        key_insights: filteredInsights.length > 0 ? filteredInsights : null,
        meeting_date: meetingDate || null,
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      toast.error("Сақталмады: " + error.message);
      return;
    }
    toast.success("Пікір ашылды!");
    router.push(`/analysis/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Club selection */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Клуб <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedClub}
          onChange={(e) => { setSelectedClub(e.target.value); setSelectedPlan(""); }}
          className="input"
          required
        >
          <option value="">Клуб таңдаңыз</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Plan selection */}
      {selectedClub && plans.length > 0 && (
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
        <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="input" />
      </div>

      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Талқы тақырыбы <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Мысалы: «Алхимик» — бүгінгі талқы"
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
          placeholder="Кітап туралы талқы нәтижесі, маңызды ойлар, пікірлер..."
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

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <RefreshCw size={16} className="animate-spin" />}
        Пікір ашу
      </button>
    </form>
  );
}
