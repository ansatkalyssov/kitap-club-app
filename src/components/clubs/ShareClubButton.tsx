"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  clubId: string;
  clubName: string;
}

export default function ShareClubButton({ clubId, clubName }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/clubs/${clubId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Сілтеме көшірілді!");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 active:scale-95"
    >
      {copied ? (
        <>
          <Check size={13} className="text-primary-600" />
          Көшірілді
        </>
      ) : (
        <>
          <Link2 size={13} />
          Сілтемені бөлісу
        </>
      )}
    </button>
  );
}
