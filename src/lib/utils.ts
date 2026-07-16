import { MONTHS_KZ } from "./constants";

export function calcDailyPages(
  currentPage: number,
  totalPages: number,
  deadline: string
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return totalPages - currentPage;
  const pagesLeft = totalPages - currentPage;
  return pagesLeft <= 0 ? 0 : Math.ceil(pagesLeft / daysLeft);
}

export function calcProgress(currentPage: number, totalPages: number): number {
  if (totalPages === 0) return 0;
  return Math.min(100, Math.round((currentPage / totalPages) * 100));
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDateKz(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_KZ[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthKz(month: number, year: number): string {
  return `${MONTHS_KZ[month - 1]} ${year}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function calcReadingStreak(
  logs: { date: string; minutes_read: number; pages_read: number }[],
  goalType: "time" | "pages",
  target: number
): number {
  if (!target) return 0;

  const logMap = new Map(logs.map((l) => [l.date, l]));
  const getValue = (l: { minutes_read: number; pages_read: number }) =>
    goalType === "time" ? l.minutes_read : l.pages_read;

  const d = new Date();
  d.setHours(0, 0, 0, 0);

  const todayStr = d.toISOString().split("T")[0];
  const todayLog = logMap.get(todayStr);
  if (!todayLog || getValue(todayLog) < target) {
    d.setDate(d.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = d.toISOString().split("T")[0];
    const log = logMap.get(dateStr);
    if (log && getValue(log) >= target) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
