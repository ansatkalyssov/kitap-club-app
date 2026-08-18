"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error.digest) {
      // Server-side error digest — log to your error tracker here if needed
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Қате орын алды</h1>
      <p className="text-sm text-gray-500">Бірдеңе дұрыс болмады. Қайталап көріңіз.</p>
      <button onClick={reset} className="btn-primary mt-2">
        Қайталау
      </button>
    </div>
  );
}
