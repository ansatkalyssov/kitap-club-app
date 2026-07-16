export const MONTHS_KZ = [
  "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
  "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан",
];

export function formatDateKz(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS_KZ[m - 1]} ${y}`;
}

export function formatMonthKz(month: number, year: number): string {
  return `${MONTHS_KZ[month - 1]} ${year}`;
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

export function calcDailyPages(currentPage: number, totalPages: number, deadline: string): number {
  const daysLeft = daysUntil(deadline);
  if (daysLeft <= 0) return totalPages - currentPage;
  const pagesLeft = totalPages - currentPage;
  return pagesLeft <= 0 ? 0 : Math.ceil(pagesLeft / daysLeft);
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
