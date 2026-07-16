import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "./Navbar";
import { Profile } from "@/lib/types";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar profile={profile as Profile} />
      <main className="flex-1 lg:ml-56">
        <div className="pt-14 pb-20 lg:pt-0 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
