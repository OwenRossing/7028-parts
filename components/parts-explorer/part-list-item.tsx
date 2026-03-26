"use client";

import { cn } from "@/lib/cn";
import type { PartSummary } from "@/types";
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS } from "@/types";

interface PartListItemProps {
  part: PartSummary;
  selected: boolean;
  onClick: () => void;
}

export function PartListItem({ part, selected, onClick }: PartListItemProps) {
  const isDone = part.status === "DONE";
  const primaryOwner = part.owners.find((o) => o.role === "PRIMARY");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-rim/40 transition-colors",
        selected
          ? "bg-surface-hover border-l-2 border-l-brand-600"
          : "hover:bg-surface-hover border-l-2 border-l-transparent",
      )}
    >
      {/* Row 1: part number + status dot */}
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-xs text-ink-muted font-mono">{part.partNumber}</span>
        <span className={cn("text-xs", isDone ? "text-green-400" : PRIORITY_COLORS[part.priority])}>
          {isDone ? "DONE" : STATUS_LABELS[part.status]}
        </span>
      </div>

      {/* Row 2: name */}
      <div className={cn("text-sm font-medium leading-tight", isDone ? "text-green-400" : "text-ink")}>
        {part.name}
      </div>

      {/* Row 3: primary owner */}
      {primaryOwner && (
        <div className="text-xs text-ink-dim mt-0.5">
          {primaryOwner.user.displayName}
        </div>
      )}

      {/* Row 4: qty if partial */}
      {part.quantityRequired > 1 && (
        <div className="text-xs text-ink-dim mt-0.5">
          {part.quantityComplete}/{part.quantityRequired} qty
        </div>
      )}
    </button>
  );
}
