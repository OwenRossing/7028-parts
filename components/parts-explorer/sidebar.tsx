"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";
import { PartListItem } from "./part-list-item";
import { GroupControls } from "./group-controls";
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

export function Sidebar({
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

  // Filtered parts for list
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

  // Home view derived lists
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

  // Rows for virtual list (filters tab only)
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
    estimateSize: (i) => (rows[i].kind === "header" ? 32 : 72),
    overscan: 10,
  });

  return (
    <div className="w-72 flex-shrink-0 flex flex-col bg-surface-sidebar border-r border-rim h-full">
      {/* Project selector */}
      <div className="px-3 py-3 border-b border-rim">
        <select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          className="w-full bg-surface-card border border-rim rounded-sm px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-rim-brand"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              Season {p.season} — {p.name}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-ink-dim">
            {parts.length} parts
          </span>
          <div className="flex items-center gap-1">
            <span className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-green-400" : "bg-ink-dim")} />
            <span className="text-xs text-ink-dim">{connected ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex border-b border-rim">
        {(["home", "todo", "filters"] as TabView[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={cn(
              "flex-1 py-2 text-xs uppercase tracking-wider font-medium transition-colors",
              tab === t
                ? "text-brand-400 border-b-2 border-brand-600 -mb-px"
                : "text-ink-dim hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "home" && (
          <div className="flex-1 overflow-y-auto">
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
          <div className="flex-1 overflow-y-auto">
            <HomeSection title="Active — Your Turn" parts={myActiveParts} selectedPartId={selectedPartId} onSelect={onSelectPart} empty="No active parts assigned to you." />
            <HomeSection title="Waiting — Blocked" parts={myWaitingParts} selectedPartId={selectedPartId} onSelect={onSelectPart} dim empty="Nothing waiting." />
          </div>
        )}

        {tab === "filters" && (
          <>
            {/* Search */}
            <div className="px-3 py-2 border-b border-rim">
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search parts…"
                className="w-full bg-surface-card border border-rim rounded-sm px-3 py-1.5 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-rim-brand"
              />
            </div>

            {/* Status filter */}
            <div className="px-3 py-2 border-b border-rim">
              <div className="text-xs text-ink-label uppercase tracking-wider mb-1.5">Status</div>
              <div className="flex flex-wrap gap-1">
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
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-sm border transition-colors",
                      statusFilter.includes(s)
                        ? "bg-brand-600/20 border-brand-600 text-brand-400"
                        : "bg-surface-btn border-rim-btn text-ink-dim hover:bg-surface-hover",
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <GroupControls groupBy={groupBy} onChange={onGroupByChange} />

            {/* Virtual list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((vi) => {
                  const row = rows[vi.index];
                  return (
                    <div
                      key={vi.key}
                      style={{ position: "absolute", top: vi.start, left: 0, right: 0, height: vi.size }}
                    >
                      {row.kind === "header" ? (
                        <div className="px-3 py-1.5 text-xs text-ink-label uppercase tracking-wider bg-surface-sidebar/80 sticky top-0 flex items-center justify-between">
                          <span>{row.label}</span>
                          <span className="text-ink-dim">{row.count}</span>
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

      {/* Add part button */}
      <div className="p-3 border-t border-rim">
        <button
          onClick={onAddPart}
          className="w-full py-2 text-sm text-brand-400 border border-brand-600/40 hover:bg-brand-600/10 rounded-sm transition-colors"
        >
          + New Part
        </button>
      </div>
    </div>
  );
}

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
    <div className="border-b border-rim/60">
      <div className="px-3 py-1.5 text-xs text-ink-label uppercase tracking-wider bg-surface-sidebar/80">
        {title}
      </div>
      {parts.length === 0 && empty ? (
        <div className="px-3 py-3 text-xs text-ink-dim">{empty}</div>
      ) : (
        parts.map((p) => (
          <div key={p.id} className={dim ? "opacity-60" : undefined}>
            <PartListItem part={p} selected={p.id === selectedPartId} onClick={() => onSelect(p.id)} />
          </div>
        ))
      )}
    </div>
  );
}
