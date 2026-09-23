"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, Trophy, Target } from "lucide-react";
import type { StarWeek } from "@/lib/stars";

/**
 * Басты беттегі тұрақтылық блогы.
 *
 * Мақсаты — қолданбаны ашқан сәтте бет тірі болып тұруы. Сол себепті
 * жанған жұлдыздарға жеті секунд сайын толқын жүгіреді, ал бүгінгі
 * жұлдыз әлі жанбаса, баяу соғып тұрады.
 *
 * Жанғанын көрсету прогресс енгізілген сәтте емес, содан кейін басты
 * бетке алғаш кіргенде болады: оқырман прогресін трекер бетінде енгізіп,
 * сол жерде қалып кетуі мүмкін — ондайда ең әдемі сәтті ешкім көрмейді.
 * Көрсеткенімізді localStorage-қа жазамыз, сондықтан күніне бір рет.
 */

const CELEBRATED_KEY = "oq_star_celebrated";

/**
 * Мыңдықтарды бөлу. toLocaleString қолданбаймыз: Node мен браузердің
 * тілдік кестелері әртүрлі болғандықтан, сервер «1 240», браузер «1,240»
 * деп жазады да, React гидратация кезінде құлайды.
 */
function formatPoints(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const GOLD = "#d97706";
const GREY = "#e2dfd8";

interface Props {
  points: number;
  levelName: string;
  /** Оқырмандар рейтингіндегі орны. Белгісіз болса — көрсетілмейді */
  rank: number | null;
  week: StarWeek;
}

export default function StarStrip({ points, levelName, rank, week }: Props) {
  const { days, streak, hasGoal, everLit } = week;
  const today = days[days.length - 1];

  const [waveAt, setWaveAt] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const started = useRef(false);

  // Толқын: кіргенде бірден, сосын жеті секунд сайын
  useEffect(() => {
    const id = setInterval(() => setWaveAt(Date.now()), 7000);
    return () => clearInterval(id);
  }, []);

  // Бүгінгі жұлдыз жанған, бірақ оны әлі көрсетпеген болсақ — тойлаймыз
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!today.lit) return;

    let seen: string | null = null;
    try {
      seen = localStorage.getItem(CELEBRATED_KEY);
    } catch {}
    if (seen === today.date) return;

    const timer = setTimeout(() => {
      setCelebrating(true);
      try {
        localStorage.setItem(CELEBRATED_KEY, today.date);
      } catch {}
      setTimeout(() => setCelebrating(false), 900);
    }, 900);

    return () => clearTimeout(timer);
  }, [today.lit, today.date]);

  // Мәтін оқырманның нақты жағдайына қарай өзгереді. Жұлдыз екі іздің
  // кез келгенінен жанатындықтан, екеуі де аталады — әйтпесе таймермен
  // оқитын адам тек прогресс керек деп ойлап қалады.
  const message = !hasGoal
    ? "Жұлдызыңыз жануы үшін күнделікті мақсатыңызды қойып, оқу прогресіңізді енгізіңіз"
    : today.lit
      ? "Бүгінгі жұлдызыңыз жанды 👏"
      : streak > 0
        ? `${streak} күндік тізбегіңіз үзілмеуі үшін бүгін де оқыңыз`
        : !everLit
          ? "Бірінші жұлдызыңызды жағыңыз — оқып, прогресіңізді енгізіңіз"
          : "Бүгінгі жұлдызыңызды жағыңыз — оқып, прогресіңізді енгізіңіз";

  return (
    <div className="card mb-6">
      <div className="flex items-start justify-between gap-3">
        <Link href="/profile/points" className="group">
          <p className="text-3xl font-bold leading-none text-primary-900 tabular-nums">
            {formatPoints(points)}
          </p>
          <p className="mt-1 text-xs text-gray-500 group-hover:text-primary-600">
            ұпай · {levelName}
          </p>
        </Link>

        {rank !== null && (
          <Link href="/rating?tab=readers" className="group text-right">
            <p className="flex items-center justify-end gap-1.5 text-2xl font-bold leading-none text-primary-900 tabular-nums">
              <Trophy size={16} className="text-primary-600" />
              {rank}
            </p>
            <p className="mt-1 text-xs text-gray-500 group-hover:text-primary-600">рейтиңде</p>
          </Link>
        )}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">Соңғы 7 күн</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
              streak > 0 ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-500"
            }`}
          >
            <Star size={12} fill={streak > 0 ? GOLD : "#b4b2a9"} stroke="none" />
            {streak > 0 ? `${streak} күн қатарынан` : "жұлдыз жоқ"}
          </span>
        </div>

        <div className="flex items-end justify-between">
          {days.map((d, i) => {
            const pending = d.isToday && !d.lit;
            return (
              <div key={d.date} className="flex-1 text-center">
                <span className="relative inline-block">
                  <Star
                    size={26}
                    // Бүгінгі жұлдыз — қуыс, шеті алтын: орны бос, бірақ
                    // сұр емес, жануға дайын
                    fill={d.lit ? GOLD : pending ? "none" : GREY}
                    stroke={d.lit ? GOLD : pending ? GOLD : GREY}
                    strokeWidth={pending ? 2 : 1.5}
                    className={[
                      "oq-star",
                      d.lit ? "oq-wave" : "",
                      pending ? "oq-beat" : "",
                      d.isToday && celebrating ? "oq-pop" : "",
                    ].join(" ")}
                    style={{ animationDelay: d.lit ? `${i * 0.07}s` : undefined }}
                    key={`${d.date}-${waveAt}-${celebrating}`}
                  />
                  {d.isToday && celebrating && <Sparkles />}
                </span>
                <p
                  className={`mt-1 text-[10px] ${d.isToday ? "text-primary-600" : "text-gray-400"}`}
                >
                  {d.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5">
        <p className="flex-1 text-[13px] leading-snug text-amber-900">{message}</p>
        {!hasGoal && (
          <Link href="/reading-plan" className="btn-primary shrink-0 px-3 py-1.5 text-xs">
            <Target size={13} /> Мақсат қою
          </Link>
        )}
      </div>
    </div>
  );
}

/** Жану сәтіндегі ұшқындар */
function Sparkles() {
  const dirs = [
    [-18, -15],
    [18, -15],
    [0, -23],
    [-15, 9],
    [15, 9],
  ];
  return (
    <>
      {dirs.map(([x, y], i) => (
        <Star
          key={i}
          size={9}
          fill={GOLD}
          stroke="none"
          className="oq-spark"
          style={
            {
              "--sx": `${x}px`,
              "--sy": `${y}px`,
              animationDelay: `${i * 0.03}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}
