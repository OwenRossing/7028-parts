"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { queryKeys } from "@/lib/query-keys";
import { useSSE } from "@/hooks/use-sse";
import { Sidebar } from "./sidebar";
import { PartDetail } from "./part-detail";
import { AddPartDialog } from "./add-part-dialog";
import { LiquidGlassSidebar } from "@/components/themes/liquid-glass/sidebar";
import { useTheme } from "@/components/theme-switcher/theme-context";
import type { PartSummary, CurrentUser, ProjectSummary, GroupBy, TabView } from "@/types";
import type { SSEEvent } from "@/lib/sse-registry";

interface PartsExplorerProps {
  initialProjects: ProjectSummary[];
  currentUser: CurrentUser;
}

export function PartsExplorer({ initialProjects, currentUser }: PartsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // URL-driven state
  const projectId = searchParams.get("project") ?? initialProjects[0]?.id ?? "";
  const selectedPartId = searchParams.get("part") ?? null;
  const tab = (searchParams.get("tab") as TabView) ?? "home";

  // Local UI state
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Parts query
  const partsQuery = useQuery<{ parts: PartSummary[] }>({
    queryKey: queryKeys.parts.list(projectId),
    queryFn: () =>
      fetch(`/api/projects/${projectId}/parts`).then((r) => r.json()),
    enabled: !!projectId,
    staleTime: 10_000,
  });

  // SSE for real-time invalidation
  const handleSSE = useCallback(
    (event: SSEEvent) => {
      if (event.type === "part_created" || event.type === "batch_committed") {
        qc.invalidateQueries({ queryKey: queryKeys.parts.list(projectId) });
      }
      if (event.type === "part_updated") {
        qc.invalidateQueries({ queryKey: queryKeys.parts.list(projectId) });
        if (selectedPartId === event.partId) {
          qc.invalidateQueries({ queryKey: queryKeys.parts.detail(event.partId) });
        }
      }
      if (event.type === "part_deleted") {
        qc.invalidateQueries({ queryKey: queryKeys.parts.list(projectId) });
        if (selectedPartId === event.partId) {
          setParam("part", null);
        }
      }
    },
    [projectId, selectedPartId, qc],
  );

  const { connected } = useSSE(projectId || null, { onEvent: handleSSE });
  const { theme } = useTheme();

  const parts = partsQuery.data?.parts ?? [];

  const sidebarProps = {
    projects: initialProjects,
    projectId,
    onProjectChange: (id: string) => setParam("project", id),
    parts,
    selectedPartId,
    onSelectPart: (id: string) => setParam("part", id),
    currentUser,
    tab,
    onTabChange: (t: TabView) => setParam("tab", t),
    groupBy,
    onGroupByChange: setGroupBy,
    search,
    onSearchChange: setSearch,
    statusFilter,
    onStatusFilterChange: setStatusFilter,
    onAddPart: () => setShowAddPart(true),
    connected,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      {theme === "liquid-glass" ? (
        <LiquidGlassSidebar {...sidebarProps} />
      ) : (
        <Sidebar {...sidebarProps} />
      )}

      {/* Detail pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPartId ? (
          <PartDetail
            key={selectedPartId}
            partId={selectedPartId}
            projectId={projectId}
            currentUser={currentUser}
          />
        ) : (
          <EmptyState onAddPart={() => setShowAddPart(true)} />
        )}
      </div>

      {showAddPart && projectId && (
        <AddPartDialog projectId={projectId} onClose={() => setShowAddPart(false)} />
      )}
    </div>
  );
}

function EmptyState({ onAddPart }: { onAddPart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="text-ink-dim text-4xl mb-4 select-none">⚙</div>
      <p className="text-ink-muted text-sm mb-6">Select a part from the sidebar to view details.</p>
      <button
        onClick={onAddPart}
        className="px-5 py-2 text-sm text-brand-400 border border-brand-600/40 hover:bg-brand-600/10 rounded-sm transition-colors"
      >
        + New Part
      </button>
    </div>
  );
}
