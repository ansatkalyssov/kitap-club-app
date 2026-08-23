"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import GoalForm from "./GoalForm";
import { ReadingGoal } from "@/lib/types";

interface Props {
  userId: string;
  goal: ReadingGoal;
}

export default function EditGoalSection({ userId, goal }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 select-none"
      >
        Мақсатты өзгерту
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="mt-3">
          <GoalForm userId={userId} existingGoal={goal} onSaved={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
