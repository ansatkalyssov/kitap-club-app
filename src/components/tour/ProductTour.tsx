"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_STEPS, TOUR_STORAGE_KEY } from "@/lib/tour";
import { completeTour } from "@/app/actions/tour";

/**
 * Танысу туры: экранды күңгірттеп, нақты элементті жарықтатып, жанында
 * түсіндірме көрсетеді. Беттер арасында өзі жүреді.
 *
 * Тұрған қадамы localStorage-та сақталады — бет ауысқанда күй жоғалмас
 * үшін. Ал «көрдім» деген белгі дерекқорда (profiles.tour_version),
 * сондықтан басқа телефоннан кірсе де қайталанбайды.
 */
export default function ProductTour({ active }: { active: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  /** Бет ауыстырып жатырмыз ба — жабылуды «бас тарту» деп санамас үшін */
  const navigatingRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active || doneRef.current) return;

    let cancelled = false;

    function readIndex(): number {
      try {
        const v = Number(localStorage.getItem(TOUR_STORAGE_KEY) ?? 0);
        return Number.isInteger(v) && v >= 0 && v < TOUR_STEPS.length ? v : 0;
      } catch {
        return 0;
      }
    }

    function saveIndex(i: number) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, String(i));
      } catch {}
    }

    function clearIndex() {
      try {
        localStorage.removeItem(TOUR_STORAGE_KEY);
      } catch {}
    }

    async function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      clearIndex();
      try {
        await completeTour();
      } catch {}
    }

    /**
     * Элементті күтеді. Бірнешеу табылса — көрінетінін алады: мәзірдің
     * мобильді және десктоп нұсқалары қатар тұрады, біреуі жасырын.
     */
    function waitFor(selector: string, timeout = 2500): Promise<Element | null> {
      return new Promise((resolve) => {
        const started = Date.now();
        const tick = () => {
          if (cancelled) return resolve(null);
          const found = Array.from(document.querySelectorAll(selector)).find(
            (el) => (el as HTMLElement).offsetParent !== null
          );
          if (found) return resolve(found);
          if (Date.now() - started > timeout) return resolve(null);
          requestAnimationFrame(tick);
        };
        tick();
      });
    }

    const globalIndex = readIndex();
    const onPage = TOUR_STEPS.map((s, i) => ({ ...s, gi: i })).filter(
      (s) => s.path === pathname
    );
    const startWithin = onPage.findIndex((s) => s.gi === globalIndex);

    // Тур басқа бетте тұр. Қолданушы өзі адасып кетсе, мазаламаймыз —
    // сол бетке оралғанда қайта шығады.
    if (startWithin < 0) return;

    const isLastPage = onPage[onPage.length - 1].gi === TOUR_STEPS.length - 1;

    (async () => {
      const steps: DriveStep[] = await Promise.all(
        onPage.map(async (s) => {
          const el = s.selector ? await waitFor(s.selector) : null;
          return {
            // Элемент табылмаса — қадам ортада, жарықтаусыз көрсетіледі.
            // Мысалы мақсат қоймаған адамда таймер әлі жоқ.
            element: (el as HTMLElement) ?? undefined,
            popover: { title: s.title, description: s.body },
          };
        })
      );

      if (cancelled) return;

      const d = driver({
        steps,
        popoverClass: "oq-tour",
        overlayColor: "#0c1f15",
        overlayOpacity: 0.7,
        stagePadding: 6,
        stageRadius: 12,
        showProgress: false,
        allowClose: true,
        nextBtnText: "Әрі қарай",
        prevBtnText: "Артқа",
        doneBtnText: isLastPage ? "Дайын" : "Әрі қарай",
        showButtons: ["next", "previous", "close"],

        onNextClick: () => {
          const i = d.getActiveIndex() ?? 0;

          if (i < steps.length - 1) {
            d.moveNext();
            return;
          }

          // Беттегі соңғы қадам
          const nextGlobal = onPage[i].gi + 1;
          if (nextGlobal >= TOUR_STEPS.length) {
            finish();
            d.destroy();
            return;
          }

          saveIndex(nextGlobal);
          navigatingRef.current = true;
          d.destroy();
          router.push(TOUR_STEPS[nextGlobal].path);
        },

        // Жабу белгісі немесе перденің сыртын басу — турды тоқтату
        onDestroyed: () => {
          if (navigatingRef.current) {
            navigatingRef.current = false;
            return;
          }
          finish();
        },
      });

      driverRef.current = d;
      d.drive(startWithin);
    })();

    return () => {
      cancelled = true;
      // Тазалау кезіндегі жабылу «бас тарту» емес
      navigatingRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, [active, pathname, router]);

  return null;
}
