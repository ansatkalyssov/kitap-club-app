import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
        <BookOpen size={28} className="text-primary-600" />
      </div>
      <p className="text-5xl font-bold text-primary-600">404</p>
      <h1 className="text-xl font-bold text-gray-900">Бет табылмады</h1>
      <p className="text-sm text-gray-500">Сіз іздеген бет жоқ немесе жылжытылған.</p>
      <Link href="/dashboard" className="btn-primary mt-2">
        Басты бетке қайту
      </Link>
    </div>
  );
}
