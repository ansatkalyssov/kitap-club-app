"use client";

import { useEffect } from "react";

/** Екі белгінің арасындағы ең аз уақыт */
const INTERVAL_MS = 15 * 60 * 1000;
const KEY = "oq_last_ping";

/**
 * Қолданба ашық тұрғанда серверге сирек белгі жібереді — кіру
 * статистикасы үшін.
 *
 * Әр бет ашылған сайын емес, 15 минутта бір рет қана: белгінің уақыты
 * localStorage-та сақталады. Бет фонда тұрғанда жіберілмейді, әйтпесе
 * ашық қалған қойынды адам қолданбаған күндерді де «кірді» деп
 * белгілеп қояр еді.
 */
export default function Heartbeat() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    async function ping() {
      if (document.visibilityState !== "visible") return;

      try {
        const last = Number(localStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < INTERVAL_MS) return;
      } catch {
        // localStorage жабық болса да белгі жіберіле берсін
      }

      try {
        const res = await fetch("/api/heartbeat", { method: "POST", keepalive: true });
        // Уақытты тек сәтті жазылғанда белгілейміз. Әйтпесе сәтсіз әрекет
        // те келесі талпынысты 15 минутқа бөгеп тастар еді.
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        if (body?.ok !== true) return;
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        // Статистика — қолданбаның жұмысына кедергі емес
      }
    }

    ping();
    timer = setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
