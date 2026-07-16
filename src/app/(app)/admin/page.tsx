import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/queries";
import { Users, BookOpen, BarChart3, Shield, BookMarked } from "lucide-react";
import UserManagement from "@/components/admin/UserManagement";
import ProgressBar from "@/components/ui/ProgressBar";
import { calcProgress, daysUntil, formatDateKz } from "@/lib/utils";

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  // Admin client — RLS айналып өтеді
  const adminDb = createAdminClient();

  // Stats
  const [
    { count: userCount },
    { count: clubCount },
    { count: trackerCount },
    { count: analysisCount },
  ] = await Promise.all([
    adminDb.from("profiles").select("id", { count: "exact" }),
    adminDb.from("clubs").select("id", { count: "exact" }).eq("is_active", true),
    adminDb.from("book_trackers").select("id", { count: "exact" }),
    adminDb.from("book_analyses").select("id", { count: "exact" }),
  ]);

  // All users
  const { data: users } = await adminDb
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // All clubs
  const { data: clubs } = await adminDb
    .from("clubs")
    .select("*, cities(name), profiles(name), club_members(count)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // All trackers with user info
  const { data: allTrackers } = await adminDb
    .from("book_trackers")
    .select("*, profiles(id, name, email, role)")
    .order("created_at", { ascending: false });

  // Group trackers by user — профиль жоқ болса да көрсету
  const trackersByUser: Record<string, any[]> = {};
  const userMap: Record<string, any> = {};
  (allTrackers || []).forEach((t) => {
    if (!trackersByUser[t.user_id]) trackersByUser[t.user_id] = [];
    trackersByUser[t.user_id].push(t);
    // Профиль бар немесе жоқ — user_id негізінде қосамыз
    if (!userMap[t.user_id]) {
      userMap[t.user_id] = t.profiles || {
        id: t.user_id,
        name: null,
        email: "—",
        role: "reader",
      };
    }
  });
  const usersWithTrackers = Object.values(userMap);

  return (
      <div className="page-container">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1>Админ панелі</h1>
            <p className="text-sm text-gray-500">Жүйені басқару</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Пайдаланушылар", value: userCount ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
            { label: "Клубтар", value: clubCount ?? 0, icon: BookOpen, color: "bg-primary-50 text-primary-600" },
            { label: "Трекерлер", value: trackerCount ?? 0, icon: BookMarked, color: "bg-yellow-50 text-yellow-600" },
            { label: "Анализдер", value: analysisCount ?? 0, icon: BarChart3, color: "bg-purple-50 text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Readers & Trackers */}
        <section className="mb-8">
          <h2 className="mb-4">Оқырмандар және трекерлер</h2>
          {usersWithTrackers.length > 0 ? (
            <div className="space-y-4">
              {usersWithTrackers.map((reader) => {
                const userTrackers = trackersByUser[reader.id] || [];
                const active = userTrackers.filter((t) => !t.is_completed);
                const completed = userTrackers.filter((t) => t.is_completed);

                return (
                  <div key={reader.id} className="card">
                    {/* Reader header */}
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                          {(reader.name || reader.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {reader.name || "—"}
                          </p>
                          <p className="text-xs text-gray-500">{reader.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {active.length > 0 && (
                          <span className="badge-green">{active.length} белсенді</span>
                        )}
                        {completed.length > 0 && (
                          <span className="badge-gray">{completed.length} аяқталған</span>
                        )}
                        {userTrackers.length === 0 && (
                          <span className="badge-gray">Трекер жоқ</span>
                        )}
                      </div>
                    </div>

                    {/* Trackers */}
                    {userTrackers.length > 0 && (
                      <div className="space-y-3">
                        {userTrackers.map((t) => {
                          const progress = calcProgress(t.current_page, t.total_pages);
                          const days = daysUntil(t.deadline);
                          return (
                            <div
                              key={t.id}
                              className={`rounded-xl border p-4 ${
                                t.is_completed
                                  ? "border-primary-100 bg-primary-50/50"
                                  : "border-gray-100 bg-gray-50"
                              }`}
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {t.book_title}
                                  </p>
                                  {t.book_author && (
                                    <p className="text-xs text-gray-500">{t.book_author}</p>
                                  )}
                                </div>
                                {t.is_completed ? (
                                  <span className="badge-green shrink-0">Аяқталды ✓</span>
                                ) : (
                                  <span className={`badge shrink-0 ${
                                    days < 0 ? "bg-red-100 text-red-700"
                                      : days <= 7 ? "badge-yellow"
                                      : "badge-gray"
                                  }`}>
                                    {days < 0 ? `${Math.abs(days)}к кешікті` : `${days} күн`}
                                  </span>
                                )}
                              </div>
                              <ProgressBar value={progress} size="sm" showLabel={false} />
                              <div className="mt-1 flex justify-between text-xs text-gray-500">
                                <span>{t.current_page} / {t.total_pages} бет</span>
                                <span>{progress}% · Дедлайн: {formatDateKz(t.deadline)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card py-10 text-center text-gray-400 text-sm">
              Трекер жасаған пайдаланушы жоқ
            </div>
          )}
        </section>

        {/* Users table */}
        <section className="mb-8">
          <h2 className="mb-4">Барлық пайдаланушылар</h2>
          <UserManagement users={users || []} />
        </section>

        {/* Clubs table */}
        <section>
          <h2 className="mb-4">Клубтар</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Клуб</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Жүргізуші</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Қала</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Мүше</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(clubs as any[] || []).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.profiles?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.cities?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="badge-green">{c.club_members?.[0]?.count ?? 0}</span>
                    </td>
                  </tr>
                ))}
                {!clubs?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Клуб жоқ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
  );
}
