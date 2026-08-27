"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: { name: string; avatar_url: string | null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) throw error;

  // Supabase панеліндегі Users тізімі тек метадеректі көрсетеді,
  // сондықтан атты сонда да жаңартамыз
  await supabase.auth.updateUser({ data: { full_name: data.name } });

  revalidatePath("/", "layout");
}
