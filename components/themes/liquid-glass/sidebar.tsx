"use client";

import { useMemo, useRef } from "react";
import { Settings } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";
import { PartListItem } from "@/components/parts-explorer/part-list-item";
import { GroupControls } from "@/components/parts-explorer/group-controls";
import type { PartSummary, GroupBy, TabView, CurrentUser, ProjectSummary } from "@/types";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS } from "@/types";

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

/* ── Shared glass style primitives ───────────────────────────────────────── */

const SIDEBAR: React.CSSProperties = {
  width: "288px",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backdropFilter: "blur(48px) saturate(180%)",
  WebkitBackdropFilter: "blur(48px) saturate(180%)",
  background: "var(--surface-sidebar)",
  borderRight: "1px solid rgba(255,255,255,0.09)",
};

const DIVIDER: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.07)",
};

const SECTION_HEADER: React.CSSProperties = {
  padding: "6px 12px 4px",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-dim)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  background: "rgba(255,255,255,0.03)",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

/* Active tab: pill with glass fill + specular top edge */
const TAB_ACTIVE: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-bright)",
  background: "rgba(255,255,255,0.1)",
  borderRadius: "9999px",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 6px rgba(0,0,0,0.25)",
  cursor: "pointer",
  transition: "all 150ms ease",
};

const TAB_INACTIVE: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-dim)",
  background: "transparent",
  borderRadius: "9999px",
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "all 150ms ease",
};

const SEARCH_INPUT: React.CSSProperties = {
  width: "100%",
  height: "36px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  padding: "0 12px",
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
  fontFamily: "inherit",
};

const NEW_PART_BTN: React.CSSProperties = {
  width: "100%",
  padding: "9px 16px",
  borderRadius: "9999px",
  border: "1px solid rgba(102,192,244,0.28)",
  background: "rgba(26,159,255,0.1)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 20px rgba(26,159,255,0.08)",
  color: "var(--ink-brand)",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.02em",
  transition: "all 150ms ease",
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "3px 10px",
    borderRadius: "9999px",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    border: active
      ? "1px solid rgba(102,192,244,0.45)"
      : "1px solid rgba(255,255,255,0.1)",
    background: active
      ? "rgba(26,159,255,0.18)"
      : "rgba(255,255,255,0.05)",
    color: active ? "var(--ink-bright)" : "var(--ink-dim)",
    boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
    transition: "all 120ms ease",
  };
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function HomeSection({
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
    <div style={DIVIDER}>
      <div style={SECTION_HEADER}>
        <span>{title}</span>
        {parts.length > 0 && (
          <span style={{ opacity: 0.6 }}>{parts.length}</span>
        )}
      </div>
      {parts.length === 0 && empty ? (
        <div style={{ padding: "10px 12px", fontSize: "12px", color: "var(--ink-dim)" }}>
          {empty}
        </div>
      ) : (
        parts.map((p) => (
          <div key={p.id} style={dim ? { opacity: 0.55 } : undefined}>
            <PartListItem
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

/* ── Main component ──────────────────────────────────────────────────────── */

export function LiquidGlassSidebar({
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
        (p) => p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q),
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
        .sort((a, b) => a.priority - b.priority || a.partNumber.localeCompare(b.partNumber))
        .slice(0, 5),
    [parts],
  );

  const myActiveParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          p.status !== "DONE" &&
          p.owners.some((o) => o.user.id === currentUser.id && o.role === "PRIMARY"),
      ),
    [parts, currentUser.id],
  );

  const myWaitingParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          p.status !== "DONE" &&
          p.owners.some((o) => o.user.id === currentUser.id && o.role === "COLLABORATOR") &&
          !p.owners.some((o) => o.user.id === currentUser.id && o.role === "PRIMARY"),
      ),
    [parts, currentUser.id],
  );

  const rows = useMemo<SidebarRow[]>(() => {
    if (tab !== "filters") return [];

    if (groupBy === "none") return filtered.map((p) => ({ kind: "part", part: p }));

    if (groupBy === "status") {
      const result: SidebarRow[] = [];
      for (const status of STATUS_ORDER) {
        const group = filtered.filter((p) => p.status === status);
        if (group.length === 0) continue;
        result.push({ kind: "header", label: STATUS_LABELS[status], count: group.length });
        group.forEach((p) => result.push({ kind: "part", part: p }));
      }
      return result;
    }

    if (groupBy === "priority") {
      const result: SidebarRow[] = [];
      for (const prio of [0, 1, 2, 3]) {
        const group = filtered.filter((p) => p.priority === prio);
        if (group.length === 0) continue;
        result.push({ kind: "header", label: PRIORITY_LABELS[prio], count: group.length });
        group.forEach((p) => result.push({ kind: "part", part: p }));
      }
      return result;
    }

    if (groupBy === "student") {
      const byStudent = new Map<string, { label: string; parts: PartSummary[] }>();
      for (const p of filtered) {
        const primary = p.owners.find((o) => o.role === "PRIMARY");
        const key = primary?.user.id ?? "__unassigned__";
        const label = primary?.user.displayName ?? "Unassigned";
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
    estimateSize: (i) => (rows[i].kind === "header" ? 28 : 72),
    overscan: 10,
  });

  return (
    <div style={SIDEBAR}>
      {/* Project selector */}
      <div style={{ padding: "12px 12px 10px", ...DIVIDER }}>
        <select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          style={{
            width: "100%",
            height: "36px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "var(--ink)",
            padding: "0 10px",
            fontSize: "13px",
            outline: "none",
            cursor: "pointer",
            appearance: "none",
            WebkitAppearance: "none",
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id} style={{ background: "#0f1826" }}>
              Season {p.season} — {p.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "7px", fontSize: "11px", color: "var(--ink-dim)" }}>
          <span>{parts.length} parts</span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "9999px",
              background: connected ? "#4ade80" : "var(--ink-dim)",
              boxShadow: connected ? "0 0 6px rgba(74,222,128,0.6)" : "none",
              display: "inline-block",
            }} />
            <span>{connected ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Nav tabs — pill style */}
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", ...DIVIDER }}>
        {(["home", "todo", "filters"] as TabView[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            style={tab === t ? TAB_ACTIVE : TAB_INACTIVE}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "home" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <HomeSection title="Most Important" parts={mostImportant} selectedPartId={selectedPartId} onSelect={onSelectPart} />
            {myActiveParts.length > 0 && (
              <HomeSection title="My TODO" parts={myActiveParts} selectedPartId={selectedPartId} onSelect={onSelectPart} />
            )}
            {myWaitingParts.length > 0 && (
              <HomeSection title="Up Next" parts={myWaitingParts} selectedPartId={selectedPartId} onSelect={onSelectPart} dim />
            )}
          </div>
        )}

        {tab === "todo" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <HomeSection title="Active — Your Turn" parts={myActiveParts} selectedPartId={selectedPartId} onSelect={onSelectPart} empty="No active parts assigned to you." />
            <HomeSection title="Waiting — Blocked" parts={myWaitingParts} selectedPartId={selectedPartId} onSelect={onSelectPart} dim empty="Nothing waiting." />
          </div>
        )}

        {tab === "filters" && (
          <>
            {/* Search */}
            <div style={{ padding: "10px 10px 8px", ...DIVIDER }}>
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search parts…"
                style={SEARCH_INPUT}
              />
            </div>

            {/* Status chips */}
            <div style={{ padding: "8px 10px", ...DIVIDER }}>
              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-dim)", marginBottom: "6px" }}>
                Status
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      onStatusFilterChange(
                        statusFilter.includes(s)
                          ? statusFilter.filter((x) => x !== s)
                          : [...statusFilter, s],
                      )
                    }
                    style={chipStyle(statusFilter.includes(s))}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <GroupControls groupBy={groupBy} onChange={onGroupByChange} />

            {/* Virtual list */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = rows[vi.index];
                  return (
                    <div
                      key={vi.key}
                      style={{ position: "absolute", top: vi.start, left: 0, right: 0, height: vi.size }}
                    >
                      {row.kind === "header" ? (
                        <div style={SECTION_HEADER}>
                          <span>{row.label}</span>
                          <span style={{ opacity: 0.6 }}>{row.count}</span>
                        </div>
                      ) : (
                        <PartListItem
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

      {/* User strip */}
      <div style={{ padding: "8px 12px", ...DIVIDER, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt=""
              style={{ width: "22px", height: "22px", borderRadius: "9999px", border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: "22px",
              height: "22px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "var(--ink-dim)",
              flexShrink: 0,
            }}>
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: "12px", color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentUser.displayName}
          </span>
          {currentUser.isAdmin && (
            <span style={{
              fontSize: "9px",
              padding: "1px 6px",
              borderRadius: "9999px",
              background: "rgba(26,159,255,0.15)",
              border: "1px solid rgba(102,192,244,0.3)",
              color: "var(--ink-brand)",
              flexShrink: 0,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}>
              admin
            </span>
          )}
        </div>
        <a
          href="/settings"
          title="Settings"
          style={{
            color: "var(--ink-dim)",
            padding: "5px",
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 120ms ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-dim)";
          }}
        >
          <Settings size={13} />
        </a>
      </div>

      {/* New Part button */}
      <div style={{ padding: "10px 12px 14px" }}>
        <button
          onClick={onAddPart}
          style={NEW_PART_BTN}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(26,159,255,0.18)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 28px rgba(26,159,255,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(26,159,255,0.1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 20px rgba(26,159,255,0.08)";
          }}
        >
          + New Part
        </button>
      </div>
    </div>
  );
}
