"use client";

import { useEffect } from "react";

/**
 * iOS-тің басты экраннан ашылған қолданбасындағы масштаб ақауын жөндейді.
 *
 * Қолданба суық ашылғанда (толық жабылып, қайта ашылғанда) Safari терезенің
 * өлшемін ашылу анимациясы кезінде өлшеп алады да, масштабты қате есептейді.
 * Нәтижесінде бет дұрыс орналасады, бірақ экранда үлкейтілген күйде көрініп,
 * оң жағы қиылып қалады. Саусақпен кішірейткенде ғана түзеледі.
 *
 * Жөндеу: масштабты бір сәтке бекітіп, сосын қайта босатамыз — Safari сол
 * кезде терезенің шын өлшемімен қайта есептейді.
 *
 * Саусақпен үлкейту мүмкіндігі сақталады: ол көзі нашар көретін оқырманға
 * керек, сондықтан біржола бекітіп тастамаймыз.
 */
export default function ViewportFix() {
  useEffect(() => {
    const standalone =
      (window.navigator as { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (!standalone) return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const base = "width=device-width, initial-scale=1, viewport-fit=cover";
    meta.setAttribute("content", `${base}, maximum-scale=1`);

    const id = setTimeout(() => meta.setAttribute("content", base), 500);
    return () => clearTimeout(id);
  }, []);

  return null;
}
