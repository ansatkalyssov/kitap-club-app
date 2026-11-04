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

/**
 * Бір баған. date — күн (YYYY-MM-DD) немесе ай (YYYY-MM).
 * note бар болса, кезең толық емес: баған бозғылт сызылады.
 */
export type DayPoint = { date: string; count: number; note?: string };

export type AnalyticsData = {
  /** Айына неше бірегей адам — әр баған бір ай */
  monthly: {
    visits: DayPoint[];
    active: DayPoint[];
    timer: DayPoint[];
    progress: DayPoint[];
    signups: DayPoint[];
  };
  totalUsers: number;
  tour: {
    reach: { label: string; count: number }[];
    started: number;
    finished: number;
    closed: number;
    dropped: number;
    before: number;
    notYet: number;
  };
  visitsToday: number;
  hasVisitData: boolean;
  visits: DayPoint[];
  /** Кіру есебі басталған күн */
  visitStart: string | null;
  activeToday: number;
  active7: number;
  active30: number;
  noClub: number;
  pushUsers: number;
  daily: DayPoint[];
  timerDaily: DayPoint[];
  progressDaily: DayPoint[];
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

const MONTHS_SHORT = [
  "Қаң", "Ақп", "Нау", "Сәу", "Мам", "Мау", "Шіл", "Там", "Қыр", "Қаз", "Қар", "Жел",
];
const MONTHS_FULL = [
  "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
  "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан",
];

const fmtMonth = (m: string) => MONTHS_SHORT[Number(m.slice(5, 7)) - 1];
const fmtMonthFull = (m: string) => `${MONTHS_FULL[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

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
  format = fmtDay,
}: {
  data: DayPoint[];
  color?: string;
  height?: number;
  /** Бағанның қолтаңбасы — күн не ай */
  format?: (date: string) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Дерек жоқ</p>;
  }

  // Баған аз болса (айлар), әрқайсысының астына қолтаңба, үстіне сан
  // телефонда да сыяды
  const few = data.length <= 12;
  const max = Math.max(1, ...data.map((d) => d.count));
  // Ең биік бағанның үстінде сан сыятындай орын қалдырамыз
  const SCALE = 86;

  // Дерек аз болғанда бағандар бүкіл ені бойынша созылып, ұсқынсыз
  // көрінеді. Ондай кезде графиктің өзін тарылтамыз — бағандардың ені
  // 30 күндіктегідей қалыпты болып тұрады.
  const maxWidth = data.length < 12 ? data.length * 64 : undefined;

  return (
    <div style={{ maxWidth }}>
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
                title={`${format(d.date)} — ${d.count}${d.note ? ` (${d.note})` : ""}`}
              >
                <div
                  className="absolute inset-x-px bottom-0 rounded-t-sm transition-opacity"
                  style={{
                    height: `${pct}%`,
                    background: color,
                    // Толық емес кезең бозғылт — салыстырғанда адастырмасын
                    opacity: dim ? 0.3 : d.note ? 0.4 : 1,
                  }}
                />
                {/* Телефонда 30 сан сыймайды — ол жерде басып көру қалады */}
                {d.count > 0 && (
                  <span
                    className={`absolute inset-x-0 text-center text-[9px] leading-none tabular-nums ${
                      few ? "" : "hidden sm:block"
                    } ${dim ? "text-gray-300" : "text-gray-500"}`}
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

      {few ? (
        <>
          <div className="mt-1.5 flex gap-px text-[10px] text-gray-400">
            {data.map((d) => (
              <span key={d.date} className="flex-1 text-center">
                {format(d.date)}
                {d.note && "*"}
              </span>
            ))}
          </div>
          <p className="mt-1 h-4 text-[10px] text-gray-500">
            {hover !== null && (
              <>
                <b className="text-gray-700">
                  {format(data[hover].date)} — {data[hover].count}
                </b>
                {data[hover].note && ` · ${data[hover].note}`}
              </>
            )}
          </p>
        </>
      ) : (
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-gray-400">
          <span>{format(data[0].date)}</span>
          {hover !== null && (
            <span className="font-semibold text-gray-700">
              {format(data[hover].date)} — {data[hover].count}
            </span>
          )}
          <span>{format(data[data.length - 1].date)}</span>
        </div>
      )}
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

/** Бір есеп үш түрде: бәрі, оқырмандар, жүргізушілер */
export type AnalyticsBundle = {
  all: AnalyticsData;
  readers: AnalyticsData;
  hosts: AnalyticsData;
};

type Scope = keyof AnalyticsBundle;

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "Барлығы" },
  { key: "readers", label: "Оқырман" },
  { key: "hosts", label: "Жүргізуші" },
];

type Mode = "days" | "months";

export default function Analytics({ data: bundle }: { data: AnalyticsBundle }) {
  const [scope, setScope] = useState<Scope>("all");
  const [mode, setMode] = useState<Mode>("days");
  const data = bundle[scope];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                scope === s.key
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.label}
              <span
                className={`ml-1.5 tabular-nums ${
                  scope === s.key ? "text-primary-100" : "text-gray-400"
                }`}
              >
                {bundle[s.key].totalUsers}
              </span>
            </button>
          ))}
        </div>

        <div className="flex rounded-xl bg-white p-0.5">
          {(
            [
              { key: "days", label: "Күндер" },
              { key: "months", label: "Айлар" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`rounded-[10px] px-3.5 py-1.5 text-xs font-medium transition ${
                mode === m.key ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "days" ? <Dashboard data={data} /> : <Monthly data={data.monthly} />}
    </div>
  );
}

const MONTH_SERIES = [
  {
    key: "visits",
    title: "Кірушілер",
    short: "Кірді",
    hint: "Айына қолданбаны кемінде бір рет ашқан адам саны — әрекет жасамаса да саналады.",
    color: "#0284c7",
  },
  {
    key: "active",
    title: "Белсенділер",
    short: "Белсенді",
    hint: "Айына із қалдырған адам саны: таймер, трекер прогресі, ұпай немесе пікір.",
    color: "#16a34a",
  },
  {
    key: "timer",
    title: "Оқу уақытын белгілегендер",
    short: "Таймер",
    hint: "Айына таймермен немесе қолмен минут енгізген адам саны.",
    color: "#d97706",
  },
  {
    key: "progress",
    title: "Трекерге прогресс енгізгендер",
    short: "Прогресс",
    hint: "Айына кітаптың бетін белгілеген адам саны.",
    color: "#7c3aed",
  },
  {
    key: "signups",
    title: "Жаңа тіркелгендер",
    short: "Тіркелді",
    hint: "Айына тіркелген адам саны.",
    color: "#0ea5e9",
  },
] as const;

/**
 * Айлық көрініс. Әр баған — сол айда кемінде бір рет әрекет жасаған
 * бірегей адам саны; күндік сандардың қосындысы емес.
 */
function Monthly({ data }: { data: AnalyticsData["monthly"] }) {
  // Кесте жолдары — барлық айлар, жаңасы жоғарыда. Кіру есебі кешірек
  // басталғандықтан, оның бағаны алғашқы айларда бос қалады.
  const months = data.active.map((p) => p.date).reverse();
  const cell = (key: (typeof MONTH_SERIES)[number]["key"], m: string) => {
    const series: DayPoint[] = data[key];
    const i = series.findIndex((p) => p.date === m);
    return { cur: series[i], prev: i > 0 ? series[i - 1] : undefined };
  };

  return (
    <div className="space-y-4">
      {MONTH_SERIES.map((s) => (
        <Card key={s.key} title={s.title} hint={s.hint}>
          {s.key === "visits" && data.visits.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Кіру есебі әлі басталмаған</p>
          ) : (
            <BarChart data={data[s.key]} color={s.color} format={fmtMonth} />
          )}
        </Card>
      ))}

      <Card
        title="Айлар кестесі"
        hint="Жақшадағы өзгеріс — алдыңғы аймен салыстыру. Тек екі ай да толық болғанда көрсетіледі: жартылай айды толық аймен салыстыру адастырады. * — ай толық емес."
      >
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-3 font-medium">Ай</th>
                {MONTH_SERIES.map((s) => (
                  <th key={s.key} className="px-2 pb-2 text-right font-medium last:pr-0">
                    {s.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-3 text-gray-700">{fmtMonthFull(m)}</td>
                  {MONTH_SERIES.map((s) => {
                    const { cur, prev } = cell(s.key, m);
                    if (!cur) {
                      return (
                        <td key={s.key} className="px-2 py-2 text-right text-gray-300 last:pr-0">
                          —
                        </td>
                      );
                    }
                    const diff =
                      prev && !prev.note && !cur.note ? cur.count - prev.count : null;
                    return (
                      <td key={s.key} className="px-2 py-2 text-right tabular-nums last:pr-0">
                        <span className={cur.note ? "text-gray-400" : "text-gray-900"}>
                          {cur.count}
                          {cur.note && "*"}
                        </span>
                        {diff !== null && diff !== 0 && (
                          <span
                            className={`ml-1.5 text-xs ${
                              diff > 0 ? "text-primary-600" : "text-red-500"
                            }`}
                          >
                            {diff > 0 ? "↑" : "↓"}
                            {Math.abs(diff)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Dashboard({ data }: { data: AnalyticsData }) {
  const tiles = [
    { label: "Тіркелген", value: data.totalUsers, color: "text-gray-900" },
    ...(data.hasVisitData
      ? [{ label: "Бүгін кірді", value: data.visitsToday, color: "text-sky-600" }]
      : []),
    { label: "Бүгін белсенді", value: data.activeToday, color: "text-primary-600" },
    { label: "7 күнде белсенді", value: data.active7, color: "text-primary-600" },
    { label: "30 күнде белсенді", value: data.active30, color: "text-primary-600" },
    { label: "Хабарландыру қосқан", value: data.pushUsers, color: "text-gray-900" },
    { label: "Клубқа кірмеген", value: data.noClub, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
          hint={
            data.visits.length < 30 && data.visitStart
              ? `Қолданбаны ашқан адам саны — әрекет жасамаса да саналады. Есеп ${fmtDay(
                  data.visitStart
                )} басталды, одан бұрынғы дерек жоқ.`
              : "Соңғы 30 күн. Қолданбаны ашқан адам саны — әрекет жасамаса да саналады."
          }
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

      <Card
        title="Оқу уақытын белгілегендер"
        hint="Соңғы 30 күн. Таймермен немесе қолмен минут енгізген адам саны."
      >
        <BarChart data={data.timerDaily} color="#d97706" />
      </Card>

      <Card
        title="Трекерге прогресс енгізгендер"
        hint="Соңғы 30 күн. Кітаптың бетін белгілеген адам саны."
      >
        <BarChart data={data.progressDaily} color="#7c3aed" />
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
        title="Танысу туры"
        hint="Есеп жаңа қосылды — бұл сандар бүгіннен бастап жиналады"
      >
        {data.tour.started > 0 ? (
          <Bars
            rows={[
              { label: "Турды бастады", count: data.tour.started },
              { label: "Соңына дейін аяқтады", count: data.tour.finished },
              { label: "Ортасынан жауып кетті", count: data.tour.closed },
              { label: "Аяқтамай, бетті тастап кетті", count: data.tour.dropped },
            ]}
            total={data.tour.started}
            color="bg-violet-500"
          />
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            Есеп қосылғаннан бері турды ешкім бастаған жоқ
          </p>
        )}

        {data.tour.started > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-primary-900">
              Қай қадамға дейін жетті
            </p>
            <p className="mb-3 text-xs text-gray-500">
              Әр жолда — сол қадамды көрген адам саны. Көрші екі жолдың
              айырмасы — сол жерде тоқтап қалғандар.
            </p>
            <Bars rows={data.tour.reach} total={data.tour.started} color="bg-violet-400" />
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-gray-400">
              {data.tour.before}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              есеп қосылғанға дейін көрген (аяқтағаны белгісіз)
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-amber-700">
              {data.tour.notYet}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              турды әлі көрмеген — келесі кіргенде көрсетіледі
            </p>
          </div>
        </div>
      </Card>

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
        hint="Соңғы 30 күн. Әр бағанда — сол әрекетті кемінде бір рет жасаған оқырман саны. Бір адам бірнеше бағанда есептелуі мүмкін."
      >
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-3 font-medium">Клуб</th>
                <th className="pb-2 px-2 text-right font-medium">Оқырман</th>
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
