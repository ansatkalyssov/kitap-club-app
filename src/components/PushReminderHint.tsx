"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  isPushSupported,
  hasPushSubscription,
  requestPushPermission,
  subscribePush,
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
export default function PushReminderHint({ reminderEnabled }: Props) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reminderEnabled || !isPushSupported()) return;
    if (Notification.permission === "denied") return;

    let dismissed = 0;
    try {
      dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {}
    if (dismissed >= 2) return;

    hasPushSubscription().then((has) => setShow(!has));
  }, [reminderEnabled]);

  function dismiss() {
    try {
      const n = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      localStorage.setItem(DISMISS_KEY, String(n + 1));
    } catch {}
    setShow(false);
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
      setShow(false);
      toast.success("Еске салғыш қосылды", { icon: "🔔" });
    } else {
      toast.error("Қосылмады: " + res.reason, { duration: 6000 });
    }
  }

  if (!show) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600">
        <Bell size={16} />
      </div>
      <p className="min-w-0 flex-1 text-sm text-gray-700">
        Еске салғышыңыз қосулы, бірақ бұл құрылғыда хабарландыруға рұқсат берілмеген
      </p>
      <button
        onClick={enable}
        disabled={loading}
        className="btn-primary shrink-0 px-3 py-1.5 text-xs disabled:opacity-50"
      >
        Рұқсат беру
      </button>
      <button
        onClick={dismiss}
        aria-label="Жабу"
        className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-white hover:text-gray-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
