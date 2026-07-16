import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

// Validates an access token with Supabase auth — result cached 30s per token.
// This means one HTTP roundtrip every 30 seconds instead of on every page load.
const fetchUserByToken = unstable_cache(
  async (accessToken: string): Promise<User | null> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return res.json();
  },
  ["auth-user"],
  { revalidate: 30 }
);

// getSession() reads cookie locally (no HTTP), then validates via cache above.
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return fetchUserByToken(session.access_token);
});

// Profile fetched via admin client (no cookies) — cached 60s per userId.
const fetchProfileById = unstable_cache(
  async (userId: string): Promise<Profile | null> => {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("*").eq("id", userId).single();
    return data as Profile | null;
  },
  ["profile"],
  { revalidate: 60 }
);

export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  return fetchProfileById(user.id);
});
