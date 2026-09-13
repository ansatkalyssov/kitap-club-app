"use client";

/**
 * Әкімші дэшборды.
 *
 * МАҢЫЗДЫ: қолданбада «кірді» деген оқиға жазылмайды, сондықтан бұл
 * жердегі «белсенді» деген сөз — із қалдырғандар: таймерді қосқан,
 * трекерге прогресс енгізген, ұпай алған немесе пікір жазған адамдар.
 * Жай ғана қарап шыққандар бұл санға кірмейді.
 */

import { useState } from "react";

export type DayPoint = { date: string; count: number };

export type AnalyticsData = {
  totalUsers: number;
  visitsToday: number;
  hasVisitData: boolean;
  visits: DayPoint[];
  activeToday: number;
  active7: number;
  active30: number;
  noClub: number;
  daily: DayPoint[];
  signups: DayPoint[];
  funnel: { label: string; count: number }[];
  frequency: { label: string; count: number }[];
  noClubDetail: {
    total: number;
    nothing: number;
    rows: {
      name: string;
      createdAt: string;
      goal: boolean;
      tracker: boolean;
      timer: boolean;
      progress: boolean;
      push: boolean;
    }[];
  };
  clubs: {
    name: string;
    members: number;
    active: number;
    timer: number;
    progress: number;
    done: number;
    comment: number;
    goal: number;
  }[];
};

const fmtDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)}.${m}`;
};

/**
 * Бағандық график — кітапхана қоспай, HTML мен CSS.
 *
 * SVG емес: созылатын viewBox ішіндегі мәтін де қисайып кетеді, ал бізге
 * бағандардың үстінде тұрақты сан керек.
 */
function BarChart({
  data,
  color = "#16a34a",
  height = 150,
}: {
  data: DayPoint[];
  color?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Дерек жоқ</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  // Ең биік бағанның үстінде сан сыятындай орын қалдырамыз
  const SCALE = 86;

  return (
    <div>
      <div className="relative" style={{ height }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <div
            key={f}
            className="absolute inset-x-0 border-t border-gray-100"
            style={{ bottom: `${f * SCALE}%` }}
          />
        ))}

        <div className="absolute inset-0 flex items-end gap-px">
          {data.map((d, i) => {
            const pct = (d.count / max) * SCALE;
            const dim = hover !== null && hover !== i;
            return (
              <div
                key={d.date}
                className="relative h-full flex-1"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
                title={`${fmtDay(d.date)} — ${d.count}`}
              >
                <div
                  className="absolute inset-x-px bottom-0 rounded-t-sm transition-opacity"
                  style={{
                    height: `${pct}%`,
                    background: color,
                    opacity: dim ? 0.3 : 1,
                  }}
                />
                {/* Телефонда 30 сан сыймайды — ол жерде басып көру қалады */}
                {d.count > 0 && (
                  <span
                    className={`absolute inset-x-0 hidden text-center text-[9px] leading-none tabular-nums sm:block ${
                      dim ? "text-gray-300" : "text-gray-500"
                    }`}
                    style={{ bottom: `calc(${pct}% + 3px)` }}
                  >
                    {d.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-gray-400">
        <span>{fmtDay(data[0].date)}</span>
        {hover !== null && (
          <span className="font-semibold text-gray-700">
            {fmtDay(data[hover].date)} — {data[hover].count}
          </span>
        )}
        <span>{fmtDay(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

/** Көлденең жолақ — воронка мен жиілік үшін */
function Bars({
  rows,
  total,
  color = "bg-primary-500",
}: {
  rows: { label: string; count: number }[];
  total: number;
  color?: string;
}) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-gray-700">{r.label}</span>
              <span className="shrink-0 tabular-nums text-gray-500">
                <b className="text-gray-900">{r.count}</b>
                <span className="ml-1.5 text-xs text-gray-400">{pct}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h3 className="text-base font-bold text-primary-900">{title}</h3>
      {hint && <p className="mb-3 mt-0.5 text-xs text-gray-500">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

export default function Analytics({ data }: { data: AnalyticsData }) {
  const tiles = [
    { label: "Тіркелген", value: data.totalUsers, color: "text-gray-900" },
    ...(data.hasVisitData
      ? [{ label: "Бүгін кірді", value: data.visitsToday, color: "text-sky-600" }]
      : []),
    { label: "Бүгін белсенді", value: data.activeToday, color: "text-primary-600" },
    { label: "7 күнде белсенді", value: data.active7, color: "text-primary-600" },
    { label: "30 күнде белсенді", value: data.active30, color: "text-primary-600" },
    { label: "Клубқа кірмеген", value: data.noClub, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="card py-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${t.color}`}>{t.value}</p>
            <p className="mt-0.5 text-xs leading-tight text-gray-500">{t.label}</p>
          </div>
        ))}
      </div>

      {data.hasVisitData && (
        <Card
          title="Күнделікті кірушілер"
          hint="Соңғы 30 күн. Қолданбаны ашқан адам саны — әрекет жасамаса да саналады."
        >
          <BarChart data={data.visits} color="#0284c7" />
        </Card>
      )}

      <Card
        title="Күнделікті белсенділік"
        hint={
          data.hasVisitData
            ? "Соңғы 30 күн. Ашып қана қоймай, әрекет жасағандар: таймер, трекер прогресі, ұпай немесе пікір. Жоғарыдағы санмен айырмасы — қолданбаны ашып, ештеңе істемей кеткендер."
            : "Соңғы 30 күн. Із қалдырған адам саны: таймер, трекер прогресі, ұпай немесе пікір. Жай қарап шыққандар саналмайды."
        }
      >
        <BarChart data={data.daily} />
      </Card>

      <Card title="Жаңа тіркелгендер" hint="Соңғы 30 күн">
        <BarChart data={data.signups} color="#0ea5e9" />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Қолданбаны меңгеру"
          hint="Тіркелгеннен бері әр қадамға жеткен адам саны"
        >
          <Bars rows={data.funnel} total={data.totalUsers} />
        </Card>

        <Card
          title="Белсенділік жиілігі"
          hint="Соңғы 30 күнде неше күн із қалдырды"
        >
          <Bars rows={data.frequency} total={data.totalUsers} color="bg-sky-500" />
        </Card>
      </div>

      <Card
        title={`Клубқа кірмегендер (${data.noClubDetail.total})`}
        hint="Клубқа кірмеген адамдардың қолданбада не істегені"
      >
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-gray-400">
              {data.noClubDetail.nothing}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              тіркелген, бірақ ештеңе істемеген
            </p>
          </div>
          <div className="rounded-xl bg-primary-50 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-primary-700">
              {data.noClubDetail.rows.length}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              клубсыз-ақ қолданбаны пайдаланып жүр
            </p>
          </div>
        </div>

        {data.noClubDetail.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-3 font-medium">Оқырман</th>
                  <th className="pb-2 px-2 font-medium">Тіркелген</th>
                  <th className="pb-2 px-2 text-center font-medium">Мақсат</th>
                  <th className="pb-2 px-2 text-center font-medium">Жеке трекер</th>
                  <th className="pb-2 px-2 text-center font-medium">Таймер</th>
                  <th className="pb-2 px-2 text-center font-medium">Прогресс</th>
                  <th className="pb-2 pl-2 text-center font-medium">Push</th>
                </tr>
              </thead>
              <tbody>
                {data.noClubDetail.rows.map((r) => {
                  const mark = (v: boolean) =>
                    v ? (
                      <span className="font-bold text-primary-600">✓</span>
                    ) : (
                      <span className="text-gray-200">—</span>
                    );
                  return (
                    <tr key={r.name + r.createdAt} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 whitespace-normal">{r.name}</td>
                      <td className="px-2 py-2 tabular-nums text-gray-500">
                        {r.createdAt.slice(0, 10)}
                      </td>
                      <td className="px-2 py-2 text-center">{mark(r.goal)}</td>
                      <td className="px-2 py-2 text-center">{mark(r.tracker)}</td>
                      <td className="px-2 py-2 text-center">{mark(r.timer)}</td>
                      <td className="px-2 py-2 text-center">{mark(r.progress)}</td>
                      <td className="py-2 pl-2 text-center">{mark(r.push)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            Клубсыз белсенді адам жоқ
          </p>
        )}
      </Card>

      <Card
        title="Клубтар"
        hint="Соңғы 30 күн. Әр бағанда — сол әрекетті кемінде бір рет жасаған мүше саны. Бір адам бірнеше бағанда есептелуі мүмкін."
      >
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-3 font-medium">Клуб</th>
                <th className="pb-2 px-2 text-right font-medium">Мүше</th>
                <th className="pb-2 px-2 text-right font-medium">Белсенді</th>
                <th className="pb-2 px-2 text-right font-medium">%</th>
                <th className="pb-2 px-2 text-right font-medium">Таймер</th>
                <th className="pb-2 px-2 text-right font-medium">Прогресс</th>
                <th className="pb-2 px-2 text-right font-medium">Кітап</th>
                <th className="pb-2 px-2 text-right font-medium">Пікір</th>
                <th className="pb-2 pl-2 text-right font-medium">Мақсат</th>
              </tr>
            </thead>
            <tbody>
              {data.clubs.map((c) => {
                const pct = c.members > 0 ? Math.round((c.active / c.members) * 100) : 0;
                // Нөлді сұр қылып қоямыз — көз бірден бар жерлерге түссін
                const cell = (n: number) =>
                  n > 0 ? "tabular-nums text-gray-900" : "tabular-nums text-gray-300";
                return (
                  <tr key={c.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 whitespace-normal">{c.name}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-600">
                      {c.members}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-gray-900">
                      {c.active}
                    </td>
                    <td
                      className={`px-2 py-2 text-right tabular-nums ${
                        pct >= 30
                          ? "text-primary-600"
                          : pct >= 10
                            ? "text-amber-600"
                            : "text-gray-400"
                      }`}
                    >
                      {pct}%
                    </td>
                    <td className={`px-2 py-2 text-right ${cell(c.timer)}`}>{c.timer}</td>
                    <td className={`px-2 py-2 text-right ${cell(c.progress)}`}>{c.progress}</td>
                    <td className={`px-2 py-2 text-right ${cell(c.done)}`}>{c.done}</td>
                    <td className={`px-2 py-2 text-right ${cell(c.comment)}`}>{c.comment}</td>
                    <td className={`py-2 pl-2 text-right ${cell(c.goal)}`}>{c.goal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
