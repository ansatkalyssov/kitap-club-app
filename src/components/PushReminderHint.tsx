"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  isPushSupported,
  hasPushSubscription,
  requestPushPermission,
  subscribePush,
  needsHomeScreen,
} from "@/lib/push";

const DISMISS_KEY = "push_hint_dismissed";

interface Props {
  /** Қолданушының еске салғышы қосулы ма — серверден келеді */
  reminderEnabled: boolean;
}

/**
 * Нақты олқылықты ғана көрсетеді: еске салғыш қосулы, ал браузерде
 * жазылым жоқ. Басқа жағдайда мүлдем шықпайды — қажетсіз сұрау адамды
 * «бөгеу» батырмасына итермелейді, ал одан кейін арна біржола жабылады.
 */
/**
 * "homescreen" — iPhone, басты экранға қосылмаған: рұқсат сұрау мүмкін
 *   емес, нұсқаулыққа сілтейміз.
 * "permission" — жазылым жоқ, бірақ рұқсат сұрауға болады.
 */
type Mode = "none" | "homescreen" | "permission";

export default function PushReminderHint({ reminderEnabled }: Props) {
  const [mode, setMode] = useState<Mode>("none");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reminderEnabled) return;

    let dismissed = 0;
    try {
      dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {}
    if (dismissed >= 2) return;

    // Бұл тексеру isPushSupported()-тен бұрын тұруы керек: iOS Safari-де
    // PushManager бар көрінеді, бірақ standalone режимінен тыс жазылым
    // жасалмайды. Әйтпесе адамға ешқашан көмектеспейтін «Рұқсат беру»
    // батырмасын көрсетер едік.
    if (needsHomeScreen()) {
      setMode("homescreen");
      return;
    }

    if (!isPushSupported() || typeof Notification === "undefined") return;
    if (Notification.permission === "denied") return;

    hasPushSubscription().then((has) => {
      if (!has) setMode("permission");
    });
  }, [reminderEnabled]);

  function dismiss() {
    try {
      const n = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      localStorage.setItem(DISMISS_KEY, String(n + 1));
    } catch {}
    setMode("none");
  }

  async function enable() {
    const asked = await requestPushPermission();
    if (!asked.ok) {
      toast.error(asked.reason, { duration: 8000 });
      return;
    }

    setLoading(true);
    const res = await subscribePush();
    setLoading(false);

    if (res.ok) {
      setMode("none");
      toast.success("Еске салғыш қосылды", { icon: "🔔" });
    } else {
      toast.error("Қосылмады: " + res.reason, { duration: 6000 });
    }
  }

  if (mode === "none") return null;

  return (
    <div className="mb-5 rounded-2xl border border-primary-100 bg-primary-50/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600">
          <Bell size={16} />
        </div>

        <p className="min-w-0 flex-1 text-sm text-gray-700">
          {mode === "homescreen"
            ? "Хабарландыру келуі үшін сайтты телефонның басты экранына қосу керек"
            : "Еске салғышыңыз қосулы, бірақ бұл құрылғыда хабарландыруға рұқсат берілмеген"}
        </p>

        {mode === "permission" && (
          <button
            onClick={enable}
            disabled={loading}
            className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Рұқсат беру
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="Жабу"
          className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-white hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      <Link
        href="/ornatu"
        className="mt-2 flex items-center gap-1 pl-12 text-xs font-semibold text-primary-700 hover:underline"
      >
        Қалай қосамын? <ArrowRight size={12} />
      </Link>
    </div>
  );
}
