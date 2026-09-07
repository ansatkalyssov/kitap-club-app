"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { restartTour } from "@/app/actions/tour";
import { TOUR_STORAGE_KEY } from "@/lib/tour";

/** Танысу турын басынан қайта көру */
export default function RestartTourButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch {}
    await restartTour();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left transition hover:border-primary-200 disabled:opacity-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Compass size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gray-900">Нұсқаулықты қайта көру</span>
        <span className="block text-sm text-gray-500">
          Қолданбамен таныстыратын қысқа экскурсия
        </span>
      </span>
    </button>
  );
}
