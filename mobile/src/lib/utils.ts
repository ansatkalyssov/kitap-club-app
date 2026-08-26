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

// Қазақстан уақыты бойынша күнтізбелік күн (YYYY-MM-DD).
// toISOString() қолдануға болмайды — ол UTC-ге аударады да, UTC+5-те
// таңғы сағаттарда алдыңғы күнді береді.
export function kzDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(d);
}

// YYYY-MM-DD жолына күн қосу/азайту — таза күнтізбелік арифметика.
export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().split("T")[0];
}

export function calcReadingStreak(
  logs: { date: string; minutes_read: number }[],
  target: number
): number {
  if (!target) return 0;

  const logMap = new Map(logs.map((l) => [l.date, l]));

  // Бүгін әлі мақсатты орындамаса, тізбек үзілмейді — санақ кешеден басталады.
  let cursor = kzDateStr();
  const todayLog = logMap.get(cursor);
  if (!todayLog || todayLog.minutes_read < target) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (true) {
    const log = logMap.get(cursor);
    if (log && log.minutes_read >= target) {
      streak++;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}
