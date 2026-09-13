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
  clubs: { name: string; members: number; active: number }[];
};

const fmtDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)}.${m}`;
};

/** Бағандық график — кітапхана қоспай, таза SVG */
function BarChart({
  data,
  color = "#16a34a",
  height = 140,
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
  const gap = 2;
  const w = 100 / data.length;

  return (
    <div>
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label="Күнделікті белсенділік"
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1="0"
              x2="100"
              y1={height - height * f}
              y2={height - height * f}
              stroke="#f3f4f6"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {data.map((d, i) => {
            const h = (d.count / max) * (height - 4);
            return (
              <rect
                key={d.date}
                x={i * w + gap / 2}
                y={height - h}
                width={Math.max(0.5, w - gap)}
                height={h}
                rx="0.6"
                fill={color}
                opacity={hover === null || hover === i ? 1 : 0.35}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {/* Ең үлкен мән — масштаб түсінікті болу үшін */}
        <span className="absolute right-0 top-0 text-[10px] tabular-nums text-gray-400">
          {max}
        </span>
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

      <Card title="Клубтар" hint="Мүше саны және олардың ішінде 30 күнде белсенділері">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 font-medium">Клуб</th>
                <th className="pb-2 text-right font-medium">Мүше</th>
                <th className="pb-2 text-right font-medium">Белсенді</th>
                <th className="pb-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data.clubs.map((c) => {
                const pct = c.members > 0 ? Math.round((c.active / c.members) * 100) : 0;
                return (
                  <tr key={c.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3">{c.name}</td>
                    <td className="py-2 text-right tabular-nums text-gray-600">{c.members}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-gray-900">
                      {c.active}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        pct >= 30 ? "text-primary-600" : pct >= 10 ? "text-amber-600" : "text-gray-400"
                      }`}
                    >
                      {pct}%
                    </td>
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
