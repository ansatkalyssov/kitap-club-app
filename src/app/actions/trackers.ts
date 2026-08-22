"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Жүргізуші жоспар қосқанда мүшелерге трекер жасайды
export async function createTrackersForMembers(params: {
  clubId: string;
  planId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string | null;
  totalPages: number;
  startDate: string;
  deadline: string;
}) {
  // Тек жүргізуші шақыра алады
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Авторизация қажет");

  // Клуб жүргізушісі екенін тексеру
  const { data: club } = await supabase
    .from("clubs")
    .select("facilitator_id")
    .eq("id", params.clubId)
    .single();

  if (!club || club.facilitator_id !== user.id) {
    throw new Error("Тек жүргізуші жоспар қоса алады");
  }

  // Admin client арқылы мүшелерге трекер жасау (RLS айналып өтеді)
  const adminDb = createAdminClient();

  const { data: members } = await adminDb
    .from("club_members")
    .select("user_id")
    .eq("club_id", params.clubId);

  if (!members || members.length === 0) return { count: 0 };

  // Бар трекерлерді тексеру
  const { data: existing } = await adminDb
    .from("book_trackers")
    .select("user_id")
    .eq("club_plan_id", params.planId);

  const existingUserIds = new Set((existing || []).map((t) => t.user_id));

  const trackersToInsert = members
    .filter((m) => !existingUserIds.has(m.user_id))
    .map((m) => ({
      user_id: m.user_id,
      book_id: params.bookId,
      club_plan_id: params.planId,
      book_title: params.bookTitle,
      book_author: params.bookAuthor,
      total_pages: params.totalPages,
      current_page: 0,
      start_date: params.startDate,
      deadline: params.deadline,
    }));

  if (trackersToInsert.length === 0) return { count: 0 };

  await adminDb.from("book_trackers").insert(trackersToInsert);

  return { count: trackersToInsert.length };
}

export async function updateTracker(
  trackerId: string,
  fields: {
    book_title: string;
    book_author: string | null;
    total_pages: number;
    deadline: string;
    cover_url?: string | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Авторизация қажет" };

  // Ownership check — club trackers are not editable by readers
  const { data: tracker } = await supabase
    .from("book_trackers")
    .select("user_id, club_plan_id")
    .eq("id", trackerId)
    .single();
  if (!tracker || tracker.user_id !== user.id || tracker.club_plan_id) return { error: "Рұқсат жоқ" };

  const { error } = await supabase
    .from("book_trackers")
    .update(fields)
    .eq("id", trackerId);

  if (error) return { error: error.message };
  revalidatePath(`/tracker/${trackerId}`);
  return { error: null };
}

export async function deleteTracker(trackerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Авторизация қажет" };

  // Ownership check — club trackers are not deletable by readers
  const { data: tracker } = await supabase
    .from("book_trackers")
    .select("user_id, club_plan_id")
    .eq("id", trackerId)
    .single();
  if (!tracker || tracker.user_id !== user.id || tracker.club_plan_id) return { error: "Рұқсат жоқ" };

  const { error } = await supabase
    .from("book_trackers")
    .delete()
    .eq("id", trackerId);

  if (error) return { error: error.message };
  revalidatePath("/tracker");
  return { error: null };
}
