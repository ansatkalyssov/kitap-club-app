/**
 * Аккаунттан шыққанда push жазылымын өшіреді.
 *
 * Жазылым браузерге байланады, аккаунтқа емес. Шығу кезінде оны
 * өшірмесек, ортақ құрылғыда келесі адам алдыңғы қолданушының оқу
 * хабарландыруларын көреді.
 */
export async function unsubscribePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

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
    // Шығуды бөгемейміз — жазылым қалса, келесі жіберуде өшеді
  }
}
