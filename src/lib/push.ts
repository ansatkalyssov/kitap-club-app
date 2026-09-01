export type PushResult = { ok: true } | { ok: false; reason: string };

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

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

/**
 * Браузер рұқсатын сұрайды.
 *
 * МАҢЫЗДЫ: бұны кез келген `await`-тен БҰРЫН шақыру керек. iOS Safari
 * рұқсатты тікелей басу әрекетінен ғана береді — арасында күту болса,
 * әрекет тізбегі үзіліп, сұрау автоматты түрде қабылданбайды.
 */
export async function requestPushPermission(): Promise<PushResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: "Бұл браузер хабарландыруды қолдамайды" };
  }

  if (isIOS() && !isStandalone()) {
    return {
      ok: false,
      reason:
        "Айфонда алдымен сайтты басты экранға қосыңыз: Бөлісу → Басты экранға қосу. Сосын сол белгішеден ашыңыз.",
    };
  }

  if (Notification.permission === "denied") {
    return {
      ok: false,
      reason: isIOS()
        ? "Хабарландыру бөгелген. Параметрлер → Хабарландырулар → Oqyrman ішінен қосыңыз."
        : "Хабарландыру бөгелген. Адрес жолағындағы құлып белгісінен рұқсат беріңіз.",
    };
  }

  if (Notification.permission === "granted") return { ok: true };

  const permission = await Notification.requestPermission();
  return permission === "granted" ? { ok: true } : { ok: false, reason: "Рұқсат берілмеді" };
}

/** Рұқсат алынғаннан кейін жазылымды жасап, серверге сақтайды */
export async function subscribePush(): Promise<PushResult> {
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      }));

    const res = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      return { ok: false, reason: error ?? "сервер қатесі" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

/** Ағымдағы браузерде жазылым бар ма */
export async function hasPushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(await reg?.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/**
 * Жазылымды толық өшіреді — серверден де, браузерден де.
 *
 * Шығу кезінде шақырылмайды: жазылым сессияға емес, браузерге байланады,
 * сондықтан шыққан адам да еске салуды алып тұрады да, хабарландыру
 * арқылы қайта оралады. Өшіру — қолданушының өз шешімі, ол дашбордтағы
 * «Хабарландыру қосылған» батырмасы арқылы жасалады.
 */
export async function unsubscribePush() {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;

    await fetch("/api/push-subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
      keepalive: true,
    });
    await sub.unsubscribe();
  } catch {
    // Шығуды бөгемейміз
  }
}
