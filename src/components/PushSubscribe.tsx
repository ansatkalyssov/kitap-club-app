"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";

export default function PushSubscribe() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  async function toggle() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/push-subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setSubscribed(false);
        toast.success("Хабарландырулар өшірілді");
      } else {
        // iOS-та web push тек «Басты экранға» қосылған кезде жұмыс істейді
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as any).standalone === true;

        if (isIOS && !isStandalone) {
          toast.error(
            "Айфонда алдымен сайтты басты экранға қосу керек: Бөлісу → Басты экранға қосу",
            { duration: 7000 }
          );
          setLoading(false);
          return;
        }

        // Бұрын бөгелген болса, браузер қайта сұрамай бірден denied қайтарады
        if (Notification.permission === "denied") {
          toast.error(
            "Хабарландыру бөгелген. Адрес жолағындағы құлып белгісін басып, Хабарландыру рұқсатын қосыңыз.",
            { duration: 7000 }
          );
          setLoading(false);
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Рұқсат берілмеді. Қайта көріңіз.");
          setLoading(false);
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await fetch("/api/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        setSubscribed(true);
        toast.success("Хабарландырулар қосылды!");
      }
    } catch {
      toast.error("Қате орын алды");
    }
    setLoading(false);
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
