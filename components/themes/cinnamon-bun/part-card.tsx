"use client";

/**
 * Android 17 / Material 3 Expressive — Part Card
 *
 * Replaces PartListItem with a richer MD3 card variant suitable for
 * a grid or list layout in the browse/filters panel.
 *
 * Card variant: Outlined (surface-container-low + outline-variant border)
 * Corner radius: 28dp (var(--a17-shape-xl))
 * Status: tonal chip (color-matched to workflow stage)
 * Priority: suggestion chip (error/tertiary/secondary/outline containers)
 * Owner: monogram avatar (MD3 list-item leading icon pattern)
 * Unassigned: avatar with generic wrench monogram in surface-container-high
 *
 * Accessible: status communicated via text + color (not color alone).
 * All interactive hover state via CSS state layer (::before overlay).
 */

import { cn } from "@/lib/cn";
import type { PartSummary } from "@/types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/types";

// ── Status color mapping (MD3 tonal — status communicates progress) ──────────

const STATUS_TONAL: Record<string, { bg: string; fg: string; ring: string }> = {
  DESIGNED: {
    bg:   "rgba(0,74,117,0.35)",
    fg:   "var(--md-ref-palette-primary80)",
    ring: "rgba(0,110,181,0.40)",
  },
  CUT: {
    bg:   "rgba(50,76,94,0.35)",
    fg:   "var(--md-ref-palette-secondary80)",
    ring: "rgba(98,129,143,0.40)",
  },
  MACHINED: {
    bg:   "rgba(100,61,0,0.35)",
    fg:   "var(--md-ref-palette-tertiary80)",
    ring: "rgba(164,94,0,0.40)",
  },
  ASSEMBLED: {
    bg:   "rgba(0,53,83,0.40)",
    fg:   "var(--md-ref-palette-primary90)",
    ring: "rgba(0,110,181,0.35)",
  },
  VERIFIED: {
    bg:   "rgba(0,80,55,0.35)",
    fg:   "#a8f5b0",
    ring: "rgba(0,130,80,0.35)",
  },
  DONE: {
    bg:   "rgba(0,65,45,0.50)",
    fg:   "#b2f2bb",
    ring: "rgba(0,120,80,0.40)",
  },
};

// ── Priority chip styling ────────────────────────────────────────────────────

const PRIORITY_TONAL: Record<number, { bg: string; fg: string }> = {
  0: { bg: "var(--md-sys-color-error-container)",    fg: "var(--md-sys-color-on-error-container)"    },
  1: { bg: "var(--md-sys-color-tertiary-container)", fg: "var(--md-sys-color-on-tertiary-container)" },
  2: { bg: "var(--md-sys-color-secondary-container)",fg: "var(--md-sys-color-on-secondary-container)"},
  3: { bg: "transparent",                            fg: "var(--md-sys-color-on-surface-variant)"    },
};

// ── Monogram avatar ──────────────────────────────────────────────────────────

function MonogramAvatar({
  name,
  size = 32,
}: {
  name: string | null;
  size?: number;
}) {
  if (!name) {
    // Unassigned — wrench glyph in surface-container-high
    return (
      <div
        aria-label="Unassigned"
        style={{
          width: size,
          height: size,
          borderRadius: "9999px",
          background: "var(--md-sys-color-surface-container-highest)",
          color: "var(--md-sys-color-on-surface-variant)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  // Hash name into one of the 3 tonal palettes
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palettes = [
    { bg: "var(--md-sys-color-primary-container)",   fg: "var(--md-sys-color-on-primary-container)"   },
    { bg: "var(--md-sys-color-secondary-container)", fg: "var(--md-sys-color-on-secondary-container)" },
    { bg: "var(--md-sys-color-tertiary-container)",  fg: "var(--md-sys-color-on-tertiary-container)"  },
  ];
  const { bg, fg } = palettes[hash % 3];

  return (
    <div
      aria-label={name}
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 500,
        letterSpacing: 0,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

// ── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const tonal = STATUS_TONAL[status] ?? STATUS_TONAL.DESIGNED;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "24px",
        padding: "0 10px",
        borderRadius: "9999px",
        background: tonal.bg,
        color: tonal.fg,
        border: `1px solid ${tonal.ring}`,
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
    </span>
  );
}

// ── Priority chip ────────────────────────────────────────────────────────────

function PriorityChip({ priority }: { priority: number }) {
  const tonal = PRIORITY_TONAL[priority] ?? PRIORITY_TONAL[2];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "24px",
        padding: "0 10px",
        borderRadius: "9999px",
        background: tonal.bg,
        color: tonal.fg,
        border: priority === 3 ? "1px solid var(--md-sys-color-outline-variant)" : "none",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {PRIORITY_LABELS[priority] ?? "Normal"}
    </span>
  );
}

// ── Quantity progress bar ─────────────────────────────────────────────────────

function QtyBar({ complete, required }: { complete: number; required: number }) {
  const pct = Math.min(100, (complete / required) * 100);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
      aria-label={`${complete} of ${required} complete`}
    >
      <div
        style={{
          flex: 1,
          height: "4px",
          borderRadius: "9999px",
          background: "var(--md-sys-color-surface-container-highest)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "9999px",
            background: pct >= 100 ? "#57e07a" : "var(--md-sys-color-primary)",
            transition: "width var(--a17-duration-medium-2) var(--a17-motion-emphasized)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--md-sys-color-on-surface-variant)",
          letterSpacing: "0.5px",
          flexShrink: 0,
        }}
      >
        {complete}/{required}
      </span>
    </div>
  );
}

// ── Main PartCard component ───────────────────────────────────────────────────

interface PartCardProps {
  part: PartSummary;
  selected: boolean;
  onClick: () => void;
  /** compact = list row style; default = card style */
  variant?: "card" | "list";
}

export function Android17PartCard({ part, selected, onClick, variant = "card" }: PartCardProps) {
  const isDone = part.status === "DONE";
  const primaryOwner = part.owners.find((o) => o.role === "PRIMARY");

  if (variant === "list") {
    /*
     * List row variant — matches the original PartListItem height (72px)
     * but uses MD3 list-item anatomy with leading avatar.
     */
    return (
      <button
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          width: "100%",
          minHeight: "72px",
          padding: "8px 16px",
          background: selected
            ? "var(--md-sys-color-surface-container-high)"
            : "transparent",
          border: "none",
          borderLeft: selected
            ? "3px solid var(--md-sys-color-primary)"
            : "3px solid transparent",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--md-sys-color-on-surface)",
          transition: "background-color var(--a17-duration-short-4) var(--a17-motion-standard)",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(157,211,255,0.06)";
          }
        }}
        onMouseLeave={(e) => {
          if (!selected) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          }
        }}
      >
        <MonogramAvatar name={primaryOwner?.user.displayName ?? null} size={36} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "2px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "var(--md-sys-color-on-surface-variant)",
                whiteSpace: "nowrap",
              }}
            >
              {part.partNumber}
            </span>
            <StatusChip status={part.status} />
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: "20px",
              color: isDone ? "#b2f2bb" : "var(--md-sys-color-on-surface)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {part.name}
          </div>
          {part.quantityRequired > 1 && (
            <div style={{ marginTop: "4px" }}>
              <QtyBar complete={part.quantityComplete} required={part.quantityRequired} />
            </div>
          )}
        </div>
      </button>
    );
  }

  /*
   * Card variant — full MD3 outlined card with all metadata.
   * Used in a grid layout in the main content area.
   */
  return (
    <button
      onClick={onClick}
      className={cn("a17-card", selected && "a17-card--selected")}
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        padding: "0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Card top — status accent line */}
      <div
        style={{
          height: "4px",
          background: STATUS_TONAL[part.status]?.ring ?? "var(--md-sys-color-outline-variant)",
          borderRadius: "28px 28px 0 0",
        }}
      />

      <div style={{ padding: "16px" }}>
        {/* Header row: part number + priority chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              color: "var(--md-sys-color-on-surface-variant)",
              letterSpacing: "0.5px",
            }}
          >
            {part.partNumber}
          </span>
          <PriorityChip priority={part.priority} />
        </div>

        {/* Part name — title-medium */}
        <div
          style={{
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: "24px",
            letterSpacing: "0.15px",
            color: isDone ? "#b2f2bb" : "var(--md-sys-color-on-surface)",
            marginBottom: "12px",
          }}
        >
          {part.name}
        </div>

        {/* Material badge */}
        {part.material && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "20px",
              padding: "0 8px",
              borderRadius: "9999px",
              background: "var(--md-sys-color-surface-container-highest)",
              color: "var(--md-sys-color-on-surface-variant)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            {part.material}
          </div>
        )}

        {/* Status chip */}
        <div style={{ marginBottom: "12px" }}>
          <StatusChip status={part.status} />
        </div>

        {/* Qty bar (if multi-qty part) */}
        {part.quantityRequired > 1 && (
          <div style={{ marginBottom: "12px" }}>
            <QtyBar complete={part.quantityComplete} required={part.quantityRequired} />
          </div>
        )}

        {/* Footer: owner avatar + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingTop: "8px",
            borderTop: "1px solid var(--md-sys-color-outline-variant)",
          }}
        >
          <MonogramAvatar name={primaryOwner?.user.displayName ?? null} size={28} />
          <span
            style={{
              fontSize: "12px",
              color: "var(--md-sys-color-on-surface-variant)",
              fontWeight: 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {primaryOwner?.user.displayName ?? "Unassigned"}
          </span>
        </div>
      </div>
    </button>
  );
}
