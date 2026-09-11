"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Жоспар өзгергенде оқырмандардың трекерлерін сәйкестендіреді.
 *
 * Трекердегі дедлайн мен кітап деректері — клубқа тіркелген сәтте
 * жасалған көшірме. Бұрын жүргізуші жоспарды өзгерткенде сол көшірмелер
 * ескі күйінде қалып қоятын: жүргізуші күнді жылжытады, ал оқырманда
 * ескі күн тұра береді.
 *
 * Тек аяқталмаған трекерлер жаңарады — оқып бітірген адамның жазбасын
 * кейін өзгерту дұрыс емес.
 *
 * Жазу admin клиентімен жүреді (RLS жүргізушіге басқа адамның трекерін
 * өзгертуге жол бермейді), сондықтан шақырушының сол клубтың жүргізушісі
 * екені алдымен тексеріледі.
 */
export async function syncPlanTrackers(planId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("club_plans")
    .select("id, club_id, end_date, book_id, books(title, author, page_count)")
    .eq("id", planId)
    .single();
  if (!plan) throw new Error("Жоспар табылмады");

  // Рұқсат: клубтың жүргізушісі немесе админ
  const [{ data: club }, { data: profile }] = await Promise.all([
    admin.from("clubs").select("facilitator_id").eq("id", plan.club_id).single(),
    admin.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (club?.facilitator_id !== user.id && profile?.role !== "admin") {
    throw new Error("Тек клубтың жүргізушісі өзгерте алады");
  }

  const book = plan.books as unknown as {
    title: string;
    author: string | null;
    page_count: number | null;
  } | null;

  const patch: Record<string, unknown> = {};
  // Жоспарда күн бос болса, трекердегі күнді жоймаймыз — оқырманда
  // мерзімсіз трекер қалып қояр еді.
  if (plan.end_date) patch.deadline = plan.end_date;
  if (book) {
    patch.book_title = book.title;
    patch.book_author = book.author;
    if (book.page_count) patch.total_pages = book.page_count;
  }
  if (Object.keys(patch).length === 0) return 0;

  const { data: updated, error } = await admin
    .from("book_trackers")
    .update(patch)
    .eq("club_plan_id", planId)
    .eq("is_completed", false)
    .select("id");
  if (error) throw error;

  // Бет саны азайса, оқылған бет одан асып кетуі мүмкін — прогресс 100%-дан
  // асып кетпес үшін шектейміз.
  if (book?.page_count) {
    await admin
      .from("book_trackers")
      .update({ current_page: book.page_count })
      .eq("club_plan_id", planId)
      .eq("is_completed", false)
      .gt("current_page", book.page_count);
  }

  return updated?.length ?? 0;
}
