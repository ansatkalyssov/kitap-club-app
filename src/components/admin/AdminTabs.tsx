"use client";

import { useState } from "react";
import {
  Users, BookOpen, BookMarked, MessageSquare, Trophy, Star, UserCog, Search,
} from "lucide-react";
import UserManagement from "./UserManagement";
import { formatDateKz } from "@/lib/utils";

const POINT_LABELS: Record<string, string> = {
  daily_goal: "Күндік мақсат",
  tracker_progress: "Трекер прогресі",
  analysis_write: "Талдау жазды",
  analysis_reply: "Пікірге жауап",
  analysis_got_reply: "Жауап алды",
  book_done: "Кітап аяқтады",
  book_done_medium: "200+ бет бонусы",
  book_done_long: "400+ бет бонусы",
  club_book_ontime: "Клуб кітабы уақытында",
  club_join: "Клубқа қосылды",
  streak_week: "Апталық streak",
  streak_7: "7 күн streak",
  streak_30: "30 күн streak",
  streak_100: "100 күн streak",
  streak_365: "365 күн streak",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  facilitator: "Жүргізуші",
  reader: "Оқырман",
};

type Tab = "overview" | "readers" | "facilitators" | "clubs" | "threads" | "rating" | "points" | "manage";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Шолу", icon: BookOpen },
  { key: "readers", label: "Оқырмандар", icon: Users },
  { key: "facilitators", label: "Жүргізушілер", icon: UserCog },
  { key: "clubs", label: "Клубтар", icon: BookMarked },
  { key: "threads", label: "Пікірлер", icon: MessageSquare },
  { key: "rating", label: "Рейтиң", icon: Trophy },
  { key: "points", label: "Ұпайлар", icon: Star },
  { key: "manage", label: "Басқару", icon: UserCog },
];

export default function AdminTabs({ stats, readers, facilitators, clubs, threads, rating, events, profiles }: any) {
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) =>
    !term || vals.some((v) => (v ?? "").toLowerCase().includes(term));

  return (
    <div>
      {/* Қойындылар */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              tab === key
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Іздеу */}
      {["readers", "facilitators", "clubs", "threads", "points"].includes(tab) && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <Search size={15} className="shrink-0 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Іздеу..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      )}

      {tab === "overview" && <Overview stats={stats} />}

      {tab === "readers" && (
        <Table
          head={["Оқырман", "Рөл", "Ұпай", "Деңгей", "Осы ай", "Клуб", "Трекер", "Соңғы оқу"]}
          rows={readers
            .filter((r: any) => match(r.name, r.email))
            .sort((a: any, b: any) => b.points - a.points)
            .map((r: any) => [
              <div key="u">
                <p className="font-medium text-gray-900">{r.name || "—"}</p>
                <p className="text-xs text-gray-400">{r.email}</p>
              </div>,
              <Badge key="r" tone={r.role === "admin" ? "purple" : r.role === "facilitator" ? "green" : "gray"}>
                {ROLE_LABELS[r.role] ?? r.role}
              </Badge>,
              <span key="p" className="font-semibold text-primary-600">{r.points}</span>,
              r.level,
              r.monthPoints,
              r.clubs,
              `${r.completed}/${r.trackers}`,
              r.lastActive ? formatDateKz(r.lastActive) : "—",
            ])}
          empty="Оқырман жоқ"
        />
      )}

      {tab === "facilitators" && (
        <div className="space-y-3">
          {facilitators
            .filter((f: any) => match(f.name, f.email))
            .map((f: any) => (
              <div key={f.id} className="card">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{f.name || "—"}</p>
                    <p className="text-xs text-gray-400">{f.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={f.role === "admin" ? "purple" : "green"}>{ROLE_LABELS[f.role]}</Badge>
                    <span className="text-sm font-semibold text-primary-600">{f.points} ұпай</span>
                  </div>
                </div>

                {f.clubs.length > 0 ? (
                  <div className="space-y-1.5">
                    {f.clubs.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <BookMarked size={13} className="shrink-0 text-primary-500" />
                        <span className="min-w-0 flex-1 truncate text-gray-700">{c.name}</span>
                        {!c.active && <Badge tone="gray">Белсенді емес</Badge>}
                        <span className="shrink-0 text-xs text-gray-500">{c.members} мүше</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Клуб жүргізбейді</p>
                )}
              </div>
            ))}
          {facilitators.length === 0 && (
            <div className="card py-10 text-center text-sm text-gray-400">Жүргізуші жоқ</div>
          )}
        </div>
      )}

      {tab === "clubs" && (
        <Table
          head={["Клуб", "Қала", "Жүргізуші", "Мүше", "Жоспар", "Пікір", "Осы ай"]}
          rows={clubs
            .filter((c: any) => match(c.name, c.city, c.facilitator))
            .map((c: any) => [
              <div key="c" className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{c.name}</span>
                {!c.active && <Badge tone="gray">Жабық</Badge>}
              </div>,
              c.city ?? "—",
              c.facilitator,
              c.members,
              c.plans,
              c.threads,
              <span key="p" className="font-semibold text-primary-600">{c.monthPoints}</span>,
            ])}
          empty="Клуб жоқ"
        />
      )}

      {tab === "threads" && (
        <Table
          head={["Тақырып", "Автор", "Клуб", "Кітап", "Жауап", "Күні"]}
          rows={threads
            .filter((t: any) => match(t.title, t.author, t.club, t.book))
            .map((t: any) => [
              <span key="t" className="font-medium text-gray-900">{t.title}</span>,
              t.author,
              t.club,
              t.book,
              t.replies,
              formatDateKz(t.createdAt.split("T")[0]),
            ])}
          empty="Пікір жоқ"
        />
      )}

      {tab === "rating" && (
        <Table
          head={["#", "Клуб", "Мүше", "Ұпай", "Орташа"]}
          rows={rating.map((r: any, i: number) => [
            <span key="i" className={`font-bold ${i < 3 ? "text-primary-600" : "text-gray-400"}`}>{i + 1}</span>,
            <span key="c" className="font-medium text-gray-900">{r.club_name}</span>,
            r.member_count,
            <span key="p" className="font-semibold text-primary-600">{r.total_points}</span>,
            r.avg_points,
          ])}
          empty="Рейтиң бос"
        />
      )}

      {tab === "points" && (
        <Table
          head={["Пайдаланушы", "Себебі", "Ұпай", "Күні"]}
          rows={events
            .filter((e: any) => match(e.user, POINT_LABELS[e.code], e.code))
            .map((e: any) => [
              <span key="u" className="font-medium text-gray-900">{e.user}</span>,
              POINT_LABELS[e.code] ?? e.code,
              <span key="p" className="font-semibold text-primary-600">+{e.points}</span>,
              formatDateKz(e.date),
            ])}
          empty="Ұпай жазбасы жоқ"
        />
      )}

      {tab === "manage" && <UserManagement users={profiles} />}
    </div>
  );
}

function Overview({ stats }: any) {
  const groups = [
    {
      title: "Пайдаланушылар",
      items: [
        { label: "Барлығы", value: stats.users },
        { label: "Оқырман", value: stats.readers },
        { label: "Жүргізуші", value: stats.facilitators },
        { label: "Админ", value: stats.admins },
      ],
    },
    {
      title: "Мазмұн",
      items: [
        { label: "Клуб", value: stats.clubs },
        { label: "Трекер", value: stats.trackers },
        { label: "Аяқталған кітап", value: stats.trackersDone },
        { label: "Пікір / жауап", value: `${stats.threads} / ${stats.replies}` },
      ],
    },
    {
      title: "Белсенділік",
      items: [
        { label: "Барлық ұпай", value: stats.totalPoints },
        { label: "Осы айда", value: stats.monthPoints },
        { label: "Бүгін оқыды", value: stats.activeToday },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-3 text-sm font-semibold text-gray-500">{g.title}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {g.items.map((it) => (
              <div key={it.label} className="card">
                <p className="text-2xl font-bold text-gray-900">{it.value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{it.label}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: any[][]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-medium text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {r.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-4 py-10 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ children, tone }: { children: any; tone: "green" | "gray" | "purple" }) {
  const tones = {
    green: "bg-primary-50 text-primary-700",
    gray: "bg-gray-100 text-gray-600",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
