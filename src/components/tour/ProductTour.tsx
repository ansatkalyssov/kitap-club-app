"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { TOUR_STEPS, TOUR_STORAGE_KEY } from "@/lib/tour";
import { beginTour, completeTour, markTourStep } from "@/app/actions/tour";

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

    /** @param finished соңғы қадамға дейін жетті ме — статистика үшін */
    async function finish(finished: boolean) {
      if (doneRef.current) return;
      doneRef.current = true;
      clearIndex();
      try {
        await completeTour(finished);
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

    // Бірінші қадам — тур шынымен басталды деген сөз. Кейінгі беттерде
    // қайта белгілемейміз, әрі сервер жағында да бос болса ғана жазады.
    if (globalIndex === 0) {
      beginTour().catch(() => {});
    } else {
      // Жаңа бетке өткен сәт — бұл да жеткен қадам
      markTourStep(globalIndex).catch(() => {});
    }

    const isLastPage = onPage[onPage.length - 1].gi === TOUR_STEPS.length - 1;

    (async () => {
      const steps: DriveStep[] = await Promise.all(
        onPage.map(async (s) => {
          const found = s.selector ? await waitFor(s.selector) : null;

          // Элемент экранның 70%-ынан биік болса, оны жарықтатпаймыз:
          // driver.js терезені сондай элементтің астына қояды да, ол
          // экраннан шығып, көрінбей қалады.
          const tooTall =
            found &&
            (found as HTMLElement).getBoundingClientRect().height >
              window.innerHeight * 0.7;

          return {
            // Элемент табылмаса немесе тым үлкен болса — қадам ортада,
            // жарықтаусыз көрсетіледі. Мысалы мақсат қоймаған адамда
            // таймер әлі жоқ.
            element: tooTall ? undefined : ((found as HTMLElement) ?? undefined),
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
            markTourStep(onPage[i + 1].gi).catch(() => {});
            d.moveNext();
            return;
          }

          // Беттегі соңғы қадам
          const nextGlobal = onPage[i].gi + 1;
          if (nextGlobal >= TOUR_STEPS.length) {
            finish(true);
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
          finish(false);
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
