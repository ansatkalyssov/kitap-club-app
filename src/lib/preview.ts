/**
 * Жаңа мүмкіндікті алдымен бір адамға ғана көрсету.
 *
 * Тірі сайтта оқырмандардың бәріне бірден шығармай, әуелі өзіміз көріп,
 * көңілімізден шықса барып ашамыз. Тізім бос болса, мүмкіндік ешкімге
 * көрінбейді — бұл кездейсоқ ашылып кетуден сақтайды.
 */
const PREVIEW_EMAILS = new Set(["ansatkalysov@yandex.ru"]);

export function isPreviewUser(email: string | null | undefined): boolean {
  return Boolean(email && PREVIEW_EMAILS.has(email.toLowerCase()));
}
