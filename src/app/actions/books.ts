"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateBook(
  bookId: string,
  data: {
    title: string;
    author: string | null;
    page_count: number | null;
    cover_url: string | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { error } = await admin.from("books").update(data).eq("id", bookId);
  if (error) throw error;
}
