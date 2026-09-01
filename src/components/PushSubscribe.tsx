"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  isPushSupported,
  hasPushSubscription,
  requestPushPermission,
  subscribePush,
  unsubscribePush,
} from "@/lib/push";

export default function PushSubscribe() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    navigator.serviceWorker.register("/sw.js").then(async () => {
      setSubscribed(await hasPushSubscription());
    });
  }, []);

  async function toggle() {
    if (subscribed) {
      setLoading(true);
      await unsubscribePush();
      setSubscribed(false);
      setLoading(false);
      toast.success("Хабарландырулар өшірілді");
      return;
    }

    // Рұқсат кез келген await-тен бұрын сұралады — iOS талабы
    const asked = await requestPushPermission();
    if (!asked.ok) {
      toast.error(asked.reason, { duration: 8000 });
      return;
    }

    setLoading(true);
    const res = await subscribePush();
    setLoading(false);

    if (res.ok) {
      setSubscribed(true);
      toast.success("Хабарландырулар қосылды!");
    } else {
      toast.error("Жазылу сәтсіз: " + res.reason, { duration: 6000 });
    }
  }

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
        subscribed
          ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {subscribed ? <Bell size={16} /> : <BellOff size={16} />}
      {subscribed ? "Хабарландыру қосылған" : "Хабарландыру қос"}
    </button>
  );
}
