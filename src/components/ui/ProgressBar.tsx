import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ProgressBar({ value, className, showLabel = true, size = "md" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full", className)}>
      <div className={cn("overflow-hidden rounded-full bg-gray-100", size === "sm" ? "h-1.5" : "h-2.5")}>
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs text-gray-500">{clamped}%</p>
      )}
    </div>
  );
}
