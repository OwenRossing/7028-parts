"use client";

/**
 * SCADA AMBER — Sidebar
 * Clean industrial sidebar. No theatrics.
 */

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  PartSummary,
  GroupBy,
  TabView,
  CurrentUser,
  ProjectSummary,
} from "@/types";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS } from "@/types";
import { ScadaPartCard } from "./part-card";

interface SidebarProps {
  projects: ProjectSummary[];
  projectId: string;
  onProjectChange: (id: string) => void;
  parts: PartSummary[];
  selectedPartId: string | null;
  onSelectPart: (id: string) => void;
  currentUser: CurrentUser;
  tab: TabView;
  onTabChange: (t: TabView) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  search: string;
  onSearchChange: (s: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (f: string[]) => void;
  onAddPart: () => void;
  connected: boolean;
}

type SidebarRow =
  | { kind: "part"; part: PartSummary }
  | { kind: "header"; label: string; count: number };

const TABS: TabView[] = ["home", "todo", "filters"];
const TAB_LABELS: Record<TabView, string> = {
  home: "HOME",
  todo: "TODO",
  filters: "LIST",
};

// Single-char status codes for compact filter display
const STATUS_CODES: Record<string, string> = {
  DESIGNED: "D",
  CUT: "C",
  MACHINED: "M",
  ASSEMBLED: "A",
  VERIFIED: "V",
  DONE: "\u2713",
};

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "NONE" },
  { value: "status", label: "STATUS" },
  { value: "priority", label: "PRIORITY" },
  { value: "student", label: "OPERATOR" },
];

export function ScadaSidebar({
  projects,
  projectId,
  onProjectChange,
  parts,
  selectedPartId,
  onSelectPart,
  currentUser,
  tab,
  onTabChange,
  groupBy,
  onGroupByChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddPart,
  connected,
}: SidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    let list = parts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.partNumber.toLowerCase().includes(q),
      );
    }
    if (statusFilter.length > 0) {
      list = list.filter((p) => statusFilter.includes(p.status));
    }
    return list;
  }, [parts, search, statusFilter]);

  const mostImportant = useMemo(
    () =>
      parts
        .filter((p) => p.status !== "DONE")
        .sort(
          (a, b) =>
            a.priority - b.priority ||
            a.partNumber.localeCompare(b.partNumber),
        )
        .slice(0, 5),
    [parts],
  );

  const myActiveParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          p.status !== "DONE" &&
          p.owners.some(
            (o) => o.user.id === currentUser.id && o.role === "PRIMARY",
          ),
      ),
    [parts, currentUser.id],
  );

  const myWaitingParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          p.status !== "DONE" &&
          p.owners.some(
            (o) =>
              o.user.id === currentUser.id && o.role === "COLLABORATOR",
          ) &&
          !p.owners.some(
            (o) => o.user.id === currentUser.id && o.role === "PRIMARY",
          ),
      ),
    [parts, currentUser.id],
  );

  const rows = useMemo<SidebarRow[]>(() => {
    if (tab !== "filters") return [];

    if (groupBy === "none") {
      return filtered.map((p) => ({ kind: "part", part: p }));
    }

    if (groupBy === "status") {
      const result: SidebarRow[] = [];
      for (const status of STATUS_ORDER) {
        const group = filtered.filter((p) => p.status === status);
        if (group.length === 0) continue;
        result.push({
          kind: "header",
          label: STATUS_LABELS[status],
          count: group.length,
        });
        group.forEach((p) => result.push({ kind: "part", part: p }));
      }
      return result;
    }

    if (groupBy === "priority") {
      const result: SidebarRow[] = [];
      for (const prio of [0, 1, 2, 3]) {
        const group = filtered.filter((p) => p.priority === prio);
        if (group.length === 0) continue;
        result.push({
          kind: "header",
          label: PRIORITY_LABELS[prio],
          count: group.length,
        });
        group.forEach((p) => result.push({ kind: "part", part: p }));
      }
      return result;
    }

    if (groupBy === "student") {
      const byStudent = new Map<
        string,
        { label: string; parts: PartSummary[] }
      >();
      for (const p of filtered) {
        const primary = p.owners.find((o) => o.role === "PRIMARY");
        const key = primary?.user.id ?? "__unassigned__";
        const label = primary?.user.displayName ?? "UNASSIGNED";
        if (!byStudent.has(key)) byStudent.set(key, { label, parts: [] });
        byStudent.get(key)!.parts.push(p);
      }
      const result: SidebarRow[] = [];
      for (const { label, parts: grp } of byStudent.values()) {
        result.push({ kind: "header", label, count: grp.length });
        grp.forEach((p) => result.push({ kind: "part", part: p }));
      }
      return result;
    }

    return filtered.map((p) => ({ kind: "part", part: p }));
  }, [filtered, groupBy, tab]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i].kind === "header" ? 26 : 68),
    overscan: 10,
  });

  return (
    <div className="sa-sidebar">
      {/* Project selector */}
      <div className="sa-sidebar-head">
        <div className="sa-label" style={{ marginBottom: 4 }}>
          ACTIVE PROJECT
        </div>
        <select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          className="sa-select"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              S{p.season} — {p.name.toUpperCase()}
            </option>
          ))}
        </select>

        <div className="sa-sidebar-meta">
          <span>
            {String(parts.length).padStart(3, "0")} PARTS
          </span>
          <div className="sa-indicator">
            <div
              className={`sa-indicator-dot${connected ? " sa-indicator-dot--live" : ""}`}
            />
            <span>{connected ? "LIVE" : "OFFLINE"}</span>
          </div>
        </div>
      </div>

      {/* Nav tabs — ALL CAPS, no animation */}
      <div className="sa-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`sa-tab${tab === t ? " sa-tab--active" : ""}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* HOME TAB */}
        {tab === "home" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ScadaSection
              title="PRIORITY QUEUE"
              parts={mostImportant}
              selectedPartId={selectedPartId}
              onSelect={onSelectPart}
            />
            {myActiveParts.length > 0 && (
              <ScadaSection
                title="MY ACTIVE"
                parts={myActiveParts}
                selectedPartId={selectedPartId}
                onSelect={onSelectPart}
              />
            )}
            {myWaitingParts.length > 0 && (
              <ScadaSection
                title="WAITING / BLOCKED"
                parts={myWaitingParts}
                selectedPartId={selectedPartId}
                onSelect={onSelectPart}
                dim
              />
            )}
          </div>
        )}

        {/* TODO TAB */}
        {tab === "todo" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <ScadaSection
              title="ACTIVE — YOUR TURN"
              parts={myActiveParts}
              selectedPartId={selectedPartId}
              onSelect={onSelectPart}
              empty="NO ACTIVE PARTS ASSIGNED."
            />
            <ScadaSection
              title="WAITING — UPSTREAM"
              parts={myWaitingParts}
              selectedPartId={selectedPartId}
              onSelect={onSelectPart}
              dim
              empty="QUEUE CLEAR."
            />
          </div>
        )}

        {/* FILTERS TAB */}
        {tab === "filters" && (
          <>
            {/* Search */}
            <div className="sa-search-wrap">
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="SEARCH PARTS..."
                className="sa-input"
                style={{ textTransform: "uppercase" }}
              />
            </div>

            {/* Status filter — single-char codes in a row */}
            <div className="sa-filter-section">
              <div className="sa-filter-label">STATUS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {STATUS_ORDER.map((s, i) => (
                  <span key={s} style={{ display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() =>
                        onStatusFilterChange(
                          statusFilter.includes(s)
                            ? statusFilter.filter((x) => x !== s)
                            : [...statusFilter, s],
                        )
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        fontFamily: "var(--sa-font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.05em",
                        padding: "2px 6px",
                        cursor: "pointer",
                        color: statusFilter.includes(s)
                          ? "var(--sa-amber-300)"
                          : "var(--sa-amber-600)",
                        transition: "color 80ms linear",
                      }}
                      title={STATUS_LABELS[s]}
                    >
                      {STATUS_CODES[s] ?? s[0]}
                    </button>
                    {i < STATUS_ORDER.length - 1 && (
                      <span style={{ color: "var(--sa-amber-700)", fontSize: 10 }}>|</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Group by */}
            <div className="sa-filter-section">
              <div className="sa-filter-label">GROUP BY</div>
              <div className="sa-filter-chips">
                {GROUP_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => onGroupByChange(g.value)}
                    className={`sa-chip${groupBy === g.value ? " sa-chip--active" : ""}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Virtual list */}
            <div
              ref={scrollRef}
              style={{ flex: 1, overflowY: "auto" }}
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = rows[vi.index];
                  return (
                    <div
                      key={vi.key}
                      style={{
                        position: "absolute",
                        top: vi.start,
                        left: 0,
                        right: 0,
                        height: vi.size,
                      }}
                    >
                      {row.kind === "header" ? (
                        <div className="sa-group-header">
                          <span>{row.label}</span>
                          <span style={{ color: "var(--sa-amber-600)" }}>
                            {String(row.count).padStart(2, "0")}
                          </span>
                        </div>
                      ) : (
                        <ScadaPartCard
                          part={row.part}
                          selected={row.part.id === selectedPartId}
                          onClick={() => onSelectPart(row.part.id)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add part button */}
      <div className="sa-sidebar-footer">
        <button onClick={onAddPart} className="sa-btn-add">
          + NEW PART
        </button>
      </div>
    </div>
  );
}

// ─── Section helper ─────────────────────────────────────────────────────────

function ScadaSection({
  title,
  parts,
  selectedPartId,
  onSelect,
  dim = false,
  empty,
}: {
  title: string;
  parts: PartSummary[];
  selectedPartId: string | null;
  onSelect: (id: string) => void;
  dim?: boolean;
  empty?: string;
}) {
  return (
    <div className="sa-border-bottom">
      <div
        style={{
          padding: "4px 12px",
          fontSize: 9,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--sa-amber-700)",
          background: "var(--sa-deep)",
          borderBottom: "1px solid var(--sa-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "var(--sa-amber-600)", fontVariantNumeric: "tabular-nums" }}>
          {String(parts.length).padStart(2, "0")}
        </span>
      </div>

      {parts.length === 0 && empty ? (
        <div
          style={{
            padding: "10px 12px",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--sa-amber-700)",
            textTransform: "uppercase",
          }}
        >
          {empty}
        </div>
      ) : (
        parts.map((p) => (
          <div key={p.id} style={{ opacity: dim ? 0.5 : 1 }}>
            <ScadaPartCard
              part={p}
              selected={p.id === selectedPartId}
              onClick={() => onSelect(p.id)}
            />
          </div>
        ))
      )}
    </div>
  );
}
