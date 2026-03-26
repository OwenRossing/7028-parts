"use client";

import { cn } from "@/lib/cn";
import type { GroupBy } from "@/types";

interface GroupControlsProps {
  groupBy: GroupBy;
  onChange: (g: GroupBy) => void;
}

const OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "student", label: "Student" },
];

export function GroupControls({ groupBy, onChange }: GroupControlsProps) {
  return (
    <div className="px-3 py-3 border-b border-rim space-y-2">
      <div className="text-xs text-ink-label uppercase tracking-wider">Group by</div>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs rounded-sm border transition-colors",
              groupBy === opt.value
                ? "bg-brand-600/20 border-brand-600 text-brand-400"
                : "bg-surface-btn border-rim-btn text-ink-muted hover:bg-surface-btn-hover hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
