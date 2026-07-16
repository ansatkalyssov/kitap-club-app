"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatDateKz } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  facilitator: "Жүргізуші",
  reader: "Оқырман",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  facilitator: "bg-blue-100 text-blue-700",
  reader: "bg-gray-100 text-gray-600",
};

export default function UserManagement({ users }: { users: Profile[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    setUpdating(null);
    if (error) {
      toast.error("Рөл өзгертілмеді");
      return;
    }
    toast.success("Рөл жаңартылды");
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-600">Пайдаланушы</th>
            <th className="px-4 py-3 font-medium text-gray-600">Email</th>
            <th className="px-4 py-3 font-medium text-gray-600">Рөл</th>
            <th className="px-4 py-3 font-medium text-gray-600">Тіркелген</th>
            <th className="px-4 py-3 font-medium text-gray-600">Басқару</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{u.name || "—"}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{u.email}</td>
              <td className="px-4 py-3">
                <span className={`badge ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {formatDateKz(u.created_at)}
              </td>
              <td className="px-4 py-3">
                <select
                  defaultValue={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  disabled={updating === u.id}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-primary-400 outline-none"
                >
                  <option value="reader">Оқырман</option>
                  <option value="facilitator">Жүргізуші</option>
                  <option value="admin">Админ</option>
                </select>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                Пайдаланушы жоқ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
