import { createClient } from "@supabase/supabase-js";

// RLS-ті айналып өтеді — тек сервер жағында қолданыңыз
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
