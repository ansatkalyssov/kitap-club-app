import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/queries";
import Navbar from "./Navbar";
import { Profile } from "@/lib/types";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Navbar profile={profile as Profile} />
      <main className="flex-1 lg:ml-56">
        <div className="pt-14 pb-28 lg:pt-0 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
