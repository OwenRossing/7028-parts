"use client";

/**
 * Cinnamon Bun — Navigation Rail Sidebar
 *
 * Replaces the current flat-nav Sidebar with an MD3 Navigation Rail pattern:
 *  - Left rail (80px) with icon + label + pill indicator
 *  - FAB-style "New Part" button at top of rail
 *  - Warm translucent surface using cinnamon-bun color tokens
 *  - Expanded content panel slides beside the rail
 *  - All color tokens from cinnamon-bun.css (CSS custom properties)
 *
 * The component is a drop-in replacement for components/parts-explorer/sidebar.tsx
 * when the cinnamon-bun theme is active. Props interface is identical.
 */

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";
import { PartListItem } from "@/components/parts-explorer/part-list-item";
import { GroupControls } from "@/components/parts-explorer/group-controls";
import type { PartSummary, GroupBy, TabView, CurrentUser, ProjectSummary } from "@/types";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS } from "@/types";

// ── Icon primitives (inline SVG — no icon lib dependency) ────────────────────

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
      />
    </svg>
  );
}

function IconTodo({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="3" y="10" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="3" y="15" width="2" height="2" rx="0.5" fill="currentColor" />
      <rect x="7" y="5.5" width="14" height="1.5" rx="0.75"
        fill={active ? "currentColor" : undefined}
        stroke={active ? undefined : "currentColor"}
        strokeWidth={active ? 0 : 1.5}
      />
      <rect x="7" y="10.5" width="10" height="1.5" rx="0.75"
        fill={active ? "currentColor" : undefined}
        stroke={active ? undefined : "currentColor"}
        strokeWidth={active ? 0 : 1.5}
      />
      <rect x="7" y="15.5" width="12" height="1.5" rx="0.75"
        fill={active ? "currentColor" : undefined}
        stroke={active ? undefined : "currentColor"}
        strokeWidth={active ? 0 : 1.5}
      />
    </svg>
  );
}

function IconFilter({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ── NavRail item ─────────────────────────────────────────────────────────────

function RailItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "8px 0",
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active
          ? "var(--md-sys-color-on-surface)"
          : "var(--md-sys-color-on-surface-variant)",
      }}
      aria-current={active ? "page" : undefined}
    >
      {/* Pill indicator */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "56px",
          height: "32px",
          borderRadius: "var(--a17-shape-full)",
          background: active ? "var(--md-sys-color-secondary-container)" : "transparent",
          color: active
            ? "var(--md-sys-color-on-secondary-container)"
            : "var(--md-sys-color-on-surface-variant)",
          transition:
            "background-color var(--a17-duration-short-4) var(--a17-motion-standard)",
        }}
      >
        {icon}
      </span>
      {/* Label */}
      <span
        style={{
          fontSize: "12px",
          fontWeight: active ? 700 : 500,
          lineHeight: "16px",
          letterSpacing: "0.5px",
          color: active
            ? "var(--md-sys-color-on-surface)"
            : "var(--md-sys-color-on-surface-variant)",
          transition: "color var(--a17-duration-short-4) var(--a17-motion-standard)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Section header for content panel lists ───────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px 4px",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        color: "var(--md-sys-color-on-surface-variant)",
        position: "sticky",
        top: 0,
        background: "var(--a17-glass-high)",
        backdropFilter: "blur(var(--a17-blur-subtle))",
        WebkitBackdropFilter: "blur(var(--a17-blur-subtle))",
        zIndex: 1,
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            background: "var(--md-sys-color-surface-container-highest)",
            color: "var(--md-sys-color-on-surface-variant)",
            borderRadius: "var(--a17-shape-full)",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── Home section ─────────────────────────────────────────────────────────────

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
  if (parts.length === 0 && !empty) return null;
  return (
    <div
      style={{
        borderBottom: "1px solid var(--md-sys-color-outline-variant)",
        marginBottom: "2px",
      }}
    >
      <SectionHeader label={title} count={parts.length > 0 ? parts.length : undefined} />
      {parts.length === 0 && empty ? (
        <div
          style={{
            padding: "12px 16px",
            fontSize: "14px",
            color: "var(--md-sys-color-on-surface-variant)",
          }}
        >
          {empty}
        </div>
      ) : (
        parts.map((p) => (
          <div key={p.id} style={{ opacity: dim ? 0.55 : 1 }}>
            <PartListItem part={p} selected={p.id === selectedPartId} onClick={() => onSelect(p.id)} />
          </div>
        ))
      )}
    </div>
  );
}

// ── Type alias for virtual list rows ─────────────────────────────────────────

type SidebarRow =
  | { kind: "part"; part: PartSummary }
  | { kind: "header"; label: string; count: number };

// ── Props (identical to original Sidebar) ────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export function Android17Sidebar({
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

  // Filtered parts
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

  const mostImportant = useMemo(() => {
    return parts
      .filter((p) => p.status !== "DONE")
      .sort((a, b) => a.priority - b.priority || a.partNumber.localeCompare(b.partNumber))
      .slice(0, 5);
  }, [parts]);

  const myActiveParts = useMemo(() => {
    return parts.filter(
      (p) => p.status !== "DONE" && p.owners.some((o) => o.user.id === currentUser.id && o.role === "PRIMARY"),
    );
  }, [parts, currentUser.id]);

  const myWaitingParts = useMemo(() => {
    return parts.filter(
      (p) =>
        p.status !== "DONE" &&
        p.owners.some((o) => o.user.id === currentUser.id && o.role === "COLLABORATOR") &&
        !p.owners.some((o) => o.user.id === currentUser.id && o.role === "PRIMARY"),
    );
  }, [parts, currentUser.id]);

  // Virtual list rows for filters tab
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
    estimateSize: (i) => (rows[i].kind === "header" ? 36 : 72),
    overscan: 10,
  });

  const navTabs: { id: TabView; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    { id: "home",    label: "Home",    icon: (a) => <IconHome active={a} />    },
    { id: "todo",    label: "Todo",    icon: (a) => <IconTodo active={a} />    },
    { id: "filters", label: "Browse",  icon: (a) => <IconFilter active={a} />  },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* ── Navigation Rail (80px) ── */}
      <div
        className="a17-glass-nav"
        style={{
          width: "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "16px",
          paddingBottom: "24px",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Team monogram (acts as brand mark at top of rail) */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "var(--a17-shape-full)",
            background: "var(--md-sys-color-primary-container)",
            color: "var(--md-sys-color-on-primary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0",
            marginBottom: "16px",
            userSelect: "none",
          }}
        >
          72
        </div>

        {/* FAB — New Part */}
        <button
          onClick={onAddPart}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "var(--a17-shape-lg)",
            background: "var(--md-sys-color-primary-container)",
            color: "var(--md-sys-color-on-primary-container)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "28px",
            boxShadow: "var(--a17-shadow-3)",
            transition:
              "box-shadow var(--a17-duration-short-4) var(--a17-motion-standard), transform var(--a17-duration-short-3) var(--a17-motion-emphasized)",
            flexShrink: 0,
          }}
          aria-label="New Part"
          title="New Part"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--a17-shadow-4)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--a17-shadow-3)"; }}
          onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          <IconPlus />
        </button>

        {/* Nav items */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "4px" }}>
          {navTabs.map(({ id, label, icon }) => (
            <RailItem
              key={id}
              label={label}
              icon={icon(tab === id)}
              active={tab === id}
              onClick={() => onTabChange(id)}
            />
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Live indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            paddingBottom: "4px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "var(--a17-shape-full)",
              background: connected ? "#57e07a" : "var(--md-sys-color-outline)",
              display: "block",
              transition: "background var(--a17-duration-medium-2) var(--a17-motion-standard)",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.4px",
              color: "var(--md-sys-color-on-surface-variant)",
            }}
          >
            {connected ? "Live" : "Off"}
          </span>
        </div>
      </div>

      {/* ── Expanded Content Panel (288px) ── */}
      <div
        style={{
          width: "288px",
          display: "flex",
          flexDirection: "column",
          background: "var(--a17-glass-mid)",
          backdropFilter: "blur(var(--a17-blur-standard)) saturate(1.4)",
          WebkitBackdropFilter: "blur(var(--a17-blur-standard)) saturate(1.4)",
          borderRight: "1px solid var(--md-sys-color-outline-variant)",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Project selector */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--md-sys-color-outline-variant)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "var(--md-sys-color-on-surface-variant)",
              marginBottom: "8px",
            }}
          >
            Project
          </div>
          <select
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            style={{
              width: "100%",
              height: "40px",
              borderRadius: "var(--a17-shape-full)",
              background: "var(--md-sys-color-surface-container-highest)",
              color: "var(--md-sys-color-on-surface)",
              border: "none",
              padding: "0 16px",
              fontSize: "14px",
              fontWeight: 500,
              outline: "none",
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} style={{ background: "#1d2023" }}>
                {p.season} — {p.name}
              </option>
            ))}
          </select>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
              fontSize: "12px",
              color: "var(--md-sys-color-on-surface-variant)",
            }}
          >
            <span>{parts.length} parts</span>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* HOME tab */}
          {tab === "home" && (
            <div
              className="a17-scrollable"
              style={{ flex: 1, overflowY: "auto" }}
            >
              <HomeSection
                title="Most Important"
                parts={mostImportant}
                selectedPartId={selectedPartId}
                onSelect={onSelectPart}
              />
              {myActiveParts.length > 0 && (
                <HomeSection
                  title="My TODO"
                  parts={myActiveParts}
                  selectedPartId={selectedPartId}
                  onSelect={onSelectPart}
                />
              )}
              {myWaitingParts.length > 0 && (
                <HomeSection
                  title="Up Next"
                  parts={myWaitingParts}
                  selectedPartId={selectedPartId}
                  onSelect={onSelectPart}
                  dim
                />
              )}
            </div>
          )}

          {/* TODO tab */}
          {tab === "todo" && (
            <div
              className="a17-scrollable"
              style={{ flex: 1, overflowY: "auto" }}
            >
              <HomeSection
                title="Active — Your Turn"
                parts={myActiveParts}
                selectedPartId={selectedPartId}
                onSelect={onSelectPart}
                empty="No active parts assigned to you."
              />
              <HomeSection
                title="Waiting — Blocked"
                parts={myWaitingParts}
                selectedPartId={selectedPartId}
                onSelect={onSelectPart}
                dim
                empty="Nothing waiting."
              />
            </div>
          )}

          {/* FILTERS tab */}
          {tab === "filters" && (
            <>
              {/* Search bar */}
              <div style={{ padding: "12px 16px 8px" }}>
                <div className="a17-searchbar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search parts…"
                    style={{ fontFamily: "inherit" }}
                  />
                  {search && (
                    <button
                      onClick={() => onSearchChange("")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--md-sys-color-on-surface-variant)",
                        padding: "0",
                        display: "flex",
                        alignItems: "center",
                      }}
                      aria-label="Clear search"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Status chips */}
              <div
                style={{
                  padding: "0 16px 12px",
                  borderBottom: "1px solid var(--md-sys-color-outline-variant)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    color: "var(--md-sys-color-on-surface-variant)",
                    marginBottom: "8px",
                  }}
                >
                  Status
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {STATUS_ORDER.map((s) => {
                    const isSelected = statusFilter.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() =>
                          onStatusFilterChange(
                            isSelected
                              ? statusFilter.filter((x) => x !== s)
                              : [...statusFilter, s],
                          )
                        }
                        className={cn(
                          "a17-chip",
                          isSelected
                            ? `a17-chip--status-${s.toLowerCase()}`
                            : undefined,
                        )}
                        style={{ height: "28px", fontSize: "12px", padding: "0 12px" }}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group controls */}
              <GroupControls groupBy={groupBy} onChange={onGroupByChange} />

              {/* Virtual list */}
              <div
                ref={scrollRef}
                className="a17-scrollable"
                style={{ flex: 1, overflowY: "auto" }}
              >
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((vi) => {
                    const row = rows[vi.index];
                    return (
                      <div
                        key={vi.key}
                        style={{ position: "absolute", top: vi.start, left: 0, right: 0, height: vi.size }}
                      >
                        {row.kind === "header" ? (
                          <SectionHeader label={row.label} count={row.count} />
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
      </div>
    </div>
  );
}
