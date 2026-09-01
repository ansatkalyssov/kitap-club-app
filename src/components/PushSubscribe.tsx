"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import toast from "react-hot-toast";

/** VAPID кілтін base64url-дан Uint8Array-ге айналдырады — Safari талабы */
function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

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

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
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
    } catch {
      toast.error("Қате орын алды");
    }
    setLoading(false);
  }

  async function toggle() {
    if (subscribed) return unsubscribe();

    // iOS-та web push тек «Басты экранға» қосылған қосымшада жұмыс істейді
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      toast.error(
        "Айфонда алдымен сайтты басты экранға қосыңыз: Бөлісу → Басты экранға қосу. Сосын сол белгішеден ашыңыз.",
        { duration: 8000 }
      );
      return;
    }

    if (Notification.permission === "denied") {
      toast.error(
        isIOS
          ? "Хабарландыру бөгелген. Параметрлер → Хабарландырулар → Oqyrman ішінен қосыңыз."
          : "Хабарландыру бөгелген. Адрес жолағындағы құлып белгісінен рұқсат беріңіз.",
        { duration: 8000 }
      );
      return;
    }

    // Рұқсатты кез келген await-тен БҰРЫН сұраймыз. iOS Safari рұқсатты
    // тікелей басу әрекетінен ғана береді — арасында await болса,
    // әрекет тізбегі үзіліп, сұрау автоматты түрде қабылданбайды.
    let permission: NotificationPermission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      toast.error("Рұқсат берілмеді");
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Safari жол емес, Uint8Array талап етеді
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const res = await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error ?? "сервер қатесі");
      }
      setSubscribed(true);
      toast.success("Хабарландырулар қосылды!");
    } catch (e) {
      toast.error("Жазылу сәтсіз: " + (e as Error).message);
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
