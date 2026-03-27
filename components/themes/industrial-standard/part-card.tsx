"use client";

/**
 * SCADA AMBER — Part Card
 * Dense data row. No scanlines, no blink.
 */

import type { PartSummary } from "@/types";
import { PRIORITY_LABELS } from "@/types";

interface ScadaPartCardProps {
  part: PartSummary;
  selected: boolean;
  onClick: () => void;
}

const STATUS_MAP: Record<
  string,
  { label: string; mod: string }
> = {
  DESIGNED:  { label: "DESIGNED",  mod: "designed" },
  CUT:       { label: "CUT",       mod: "cut" },
  MACHINED:  { label: "MACHINED",  mod: "machined" },
  ASSEMBLED: { label: "ASSEMBLED", mod: "assembled" },
  VERIFIED:  { label: "VERIFIED",  mod: "verified" },
  DONE:      { label: "DONE",      mod: "done" },
};

const PRIORITY_SYMBOL = ["\u25A0\u25A0\u25A0", "\u25A0\u25A0\u25A1", "\u25A0\u25A1\u25A1", "\u25A1\u25A1\u25A1"];

export function ScadaPartCard({ part, selected, onClick }: ScadaPartCardProps) {
  const isDone = part.status === "DONE";
  const primaryOwner = part.owners.find((o) => o.role === "PRIMARY");
  const statusEntry = STATUS_MAP[part.status] ?? { label: part.status, mod: "designed" };

  const qtyPct =
    part.quantityRequired > 0
      ? part.quantityComplete / part.quantityRequired
      : 0;

  return (
    <button
      onClick={onClick}
      className={`sa-part-item${selected ? " sa-part-item--selected" : ""}`}
    >
      {/* Row 1: Part number + status badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          marginBottom: 2,
        }}
      >
        <span className="sa-part-num">{part.partNumber}</span>
        <span className={`sa-status-badge sa-status-badge--${statusEntry.mod}`}>
          {statusEntry.label}
        </span>
      </div>

      {/* Row 2: Part name */}
      <div className={`sa-part-name${isDone ? " sa-part-name--done" : ""}`}>
        {part.name.toUpperCase()}
      </div>

      {/* Row 3: Owner + priority indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 2,
        }}
      >
        <span className="sa-part-owner">
          {primaryOwner
            ? primaryOwner.user.displayName.toUpperCase()
            : "UNASSIGNED"}
        </span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.06em",
            color:
              part.priority === 0
                ? "var(--sa-alert)"
                : part.priority === 1
                ? "var(--sa-warn)"
                : "var(--sa-amber-700)",
            fontVariantNumeric: "tabular-nums",
          }}
          title={`Priority: ${PRIORITY_LABELS[part.priority]}`}
        >
          {PRIORITY_SYMBOL[part.priority]}
        </span>
      </div>

      {/* Row 4: Qty progress bar (only shown if qty > 1) */}
      {part.quantityRequired > 1 && (
        <div style={{ marginTop: 4 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: "var(--sa-amber-700)",
              marginBottom: 2,
              letterSpacing: "0.08em",
            }}
          >
            <span>QTY</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {String(part.quantityComplete).padStart(2, "0")}/
              {String(part.quantityRequired).padStart(2, "0")}
            </span>
          </div>
          <div className="sa-progress-wrap">
            <div
              className={`sa-progress-fill${isDone ? " sa-progress-fill--done" : ""}`}
              style={{ width: `${Math.round(qtyPct * 100)}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}
