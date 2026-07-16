import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/lib/types";

// Per-request cache: only 1 HTTP call to Supabase auth per page load
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// Per-request cache: only 1 DB query for profile per page load
export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
});
