"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function leaveClub(clubId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  // Клубтың барлық жоспар идентификаторларын аламыз
  const { data: plans } = await admin
    .from("club_plans")
    .select("id")
    .eq("club_id", clubId);

  const planIds = (plans || []).map((p) => p.id);

  // Мүшенің осы клубпен байланысты барлық трекерлерін жоямыз
  if (planIds.length > 0) {
    const { error: trackerError } = await admin
      .from("book_trackers")
      .delete()
      .eq("user_id", user.id)
      .in("club_plan_id", planIds);
    if (trackerError) throw trackerError;
  }

  // Клуб мүшелігін жоямыз
  const { error } = await admin
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", user.id);
  if (error) throw error;
}
