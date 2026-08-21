"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function leaveClub(clubId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  // Клубтың барлық жоспар идентификаторларын аламыз
  const { data: plans, error: plansError } = await admin
    .from("club_plans")
    .select("id")
    .eq("club_id", clubId);

  if (plansError) {
    console.error("[leaveClub] plans fetch error:", plansError);
    throw plansError;
  }

  const planIds = (plans || []).map((p: any) => p.id);
  console.log("[leaveClub] user:", user.id, "clubId:", clubId, "planIds:", planIds);

  // Мүшенің осы клубпен байланысты барлық трекерлерін жоямыз
  if (planIds.length > 0) {
    const { error: trackerError, count } = await admin
      .from("book_trackers")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .in("club_plan_id", planIds);

    console.log("[leaveClub] deleted trackers:", count, "error:", trackerError);
    if (trackerError) throw trackerError;
  }

  // Клуб мүшелігін жоямыз
  const { error } = await admin
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[leaveClub] membership delete error:", error);
    throw error;
  }

  revalidatePath("/tracker");
  revalidatePath("/", "layout");
}
