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

// Қазақстан уақыты бойынша күнтізбелік күн (YYYY-MM-DD).
// toISOString() қолдануға болмайды — ол UTC-ге аударады да, UTC+5-те
// таңғы сағаттарда алдыңғы күнді береді. Серверде де (Vercel UTC-де
// жүреді), браузерде де бірдей нәтиже шығуы үшін белдеу нақты бекітілген.
export function kzDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(d);
}

// Ағымдағы айдың бірінші және соңғы күні (Қазақстан уақыты бойынша).
// Клуб рейтингі айлық кесіндімен есептеледі.
export function monthBounds(d: Date = new Date()): { start: string; end: string; label: string } {
  const [y, m] = kzDateStr(d).split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const MONTHS = [
    "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
    "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан",
  ];
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
    label: `${MONTHS[m - 1]} ${y}`,
  };
}

// YYYY-MM-DD жолына күн қосу/азайту. Ішінде UTC қолданылады —
// бұл таза күнтізбелік арифметика, белдеу ығысуы әсер етпейді.
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

  // Бүгін әлі мақсатты орындамаса, тізбек үзілмейді — әлі кеш емес.
  // Сондықтан санақ кешеден басталады.
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
