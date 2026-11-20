"use client";

import { useEffect, useRef } from "react";

/**
 * Үлгерім тізімі: оқырман біреуді басып озса, оның жолы бұрынғы орнынан
 * жаңа орнына жоғары сырғиды, ал басып озылғандар бір орын төмен түседі.
 *
 * Бұрынғы рет браузерде сақталады (localStorage) — дерекқорға жазылмайды.
 * Бірінші кіргенде салыстыратын ештеңе жоқ, сондықтан тек ретті есте
 * сақтаймыз. Ретті әр кіргенде жаңартамыз, сондықтан анимация бір рет
 * ойнайды. Жоспар беті мен толық тізім бір кілтті бөліседі: біреуінде
 * көрсе, екіншісінде қайталанбайды.
 *
 * Әлі бір бет те белгілемегендер басып озылған болып саналмайды — алғаш
 * бет енгізген адам кітапты ашпаған бүкіл клубтан «озып» шықпасын.
 *
 * Тізімнің жолдары серверде сызылады: олар `data-uid` белгісімен келеді,
 * ал бұл компонент тек соларды жылжытады.
 */
export default function RankFlip({
  planId,
  myId,
  order,
  started,
  className,
  children,
}: {
  planId: string;
  myId: string;
  /** Тізімдегі қазіргі рет — оқырман id-лері */
  order: string[];
  /** Кемінде бір бет белгілегендер */
  started: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    // Әзірлеу кезінде React эффектіні екі рет шақырады: екіншісі жаңа
    // ғана жазылған ретті көріп, анимацияны жоғалтып алмасын
    if (played.current) return;
    played.current = true;

    const key = `oq_rank:${planId}`;
    let prev: unknown = null;
    try {
      prev = JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {}
    try {
      localStorage.setItem(key, JSON.stringify(order));
    } catch {}
    if (!Array.isArray(prev)) return;

    const before = prev as string[];
    const oldMe = before.indexOf(myId);
    const newMe = order.indexOf(myId);
    if (oldMe < 0 || newMe < 0) return;

    // Басып озылғандар: бұрын менен жоғары тұрған, енді төмен
    const begun = new Set(started);
    const overtaken = order.slice(newMe + 1).filter((id) => {
      const i = before.indexOf(id);
      return begun.has(id) && i >= 0 && i < oldMe;
    });
    if (overtaken.length === 0) return;

    const root = ref.current;
    const row = (id: string) => root?.querySelector<HTMLElement>(`[data-uid="${id}"]`) ?? null;
    const me = row(myId);
    if (!root || !me) return;

    me.dataset.up = `↑ ${overtaken.length}`;
    me.classList.add("oq-overtake");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Бір жолдың қадамы — көрші екі жолдың арасы (аралықты қоса)
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-uid]"));
    const pitch =
      rows.length > 1
        ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top
        : me.offsetHeight;

    const timing: KeyframeAnimationOptions = {
      duration: 650,
      delay: 350,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "backwards",
    };
    me.animate(
      [{ transform: `translateY(${overtaken.length * pitch}px)` }, { transform: "none" }],
      timing
    );
    overtaken.forEach((id) =>
      row(id)?.animate([{ transform: `translateY(${-pitch}px)` }, { transform: "none" }], timing)
    );
  }, [planId, myId, order, started]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
