"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, Users, BookMarked, BarChart3, LogOut, Shield, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface NavbarProps {
  profile: Profile;
}

const navItems = [
  { href: "/dashboard", label: "Басты бет", mobileLabel: "Басты", icon: LayoutDashboard },
  { href: "/clubs", label: "Клубтар", mobileLabel: "Клубтар", icon: Users },
  { href: "/tracker", label: "Трекер", mobileLabel: "Трекер", icon: BookMarked },
  { href: "/reading-plan", label: "Күнделікті оқу", mobileLabel: "Оқу", icon: Target },
  { href: "/analysis", label: "Пікір алмасу", mobileLabel: "Пікір", icon: BarChart3 },
];

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
    toast.success("Шықтыңыз");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-gray-100 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-bold text-primary-900 text-sm">Кітап Клубы</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          {profile.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                pathname.startsWith("/admin")
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Shield size={18} />
              Админ
            </Link>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-100 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
              {(profile.name || profile.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile.name || "Пайдаланушы"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {profile.role === "admin" ? "Админ" : profile.role === "facilitator" ? "Жүргізуші" : "Оқырман"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Шығу
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
            <BookOpen size={14} className="text-white" />
          </div>
          <span className="font-bold text-primary-900 text-sm">Кітап Клубы</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          <LogOut size={14} />
          Шығу
        </button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex flex-col border-t border-gray-100 bg-white lg:hidden">
        <div className="flex">
          {navItems.map(({ href, mobileLabel, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition",
                  active ? "text-primary-600" : "text-gray-500"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px]">{mobileLabel}</span>
              </Link>
            );
          })}
          {profile.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition",
                pathname.startsWith("/admin") ? "text-primary-600" : "text-gray-500"
              )}
            >
              <Shield size={20} />
              <span className="text-[10px]">Админ</span>
            </Link>
          )}
        </div>
        <div className="safe-bottom" />
      </nav>
    </>
  );
}
