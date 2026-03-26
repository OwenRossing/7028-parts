"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/cn";
import { ORDER, nextStatus } from "@/lib/status";
import type { PartDetail as PartDetailType, CurrentUser } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/types";

interface PartDetailProps {
  partId: string;
  projectId: string;
  currentUser: CurrentUser;
}

export function PartDetail({ partId, projectId, currentUser }: PartDetailProps) {
  const qc = useQueryClient();
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery<{ part: PartDetailType }>({
    queryKey: queryKeys.parts.detail(partId),
    queryFn: () =>
      fetch(`/api/projects/${projectId}/parts/${partId}`).then((r) => r.json()),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/projects/${projectId}/parts/${partId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.parts.detail(partId) });
      qc.invalidateQueries({ queryKey: queryKeys.parts.list(projectId) });
    },
  });

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/parts/${partId}/photos`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      setPhotoFile(null);
      qc.invalidateQueries({ queryKey: queryKeys.parts.detail(partId) });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-dim text-sm">
        Loading…
      </div>
    );
  }

  const part = data?.part;
  if (!part) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-dim text-sm">
        Part not found.
      </div>
    );
  }

  const isDone = part.status === "DONE";
  const primaryOwner = part.owners.find((o) => o.role === "PRIMARY");
  const isOwner = part.owners.some((o) => o.user.id === currentUser.id);
  const canManage = currentUser.isAdmin || isOwner;
  const next = nextStatus(part.status);
  const currentIdx = ORDER.indexOf(part.status);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-header border-b border-rim px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-ink-muted font-mono mb-0.5">{part.partNumber}</div>
            <h2 className={cn("text-lg font-semibold leading-tight", isDone ? "text-green-400" : "text-ink")}>
              {part.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn("text-xs font-medium", PRIORITY_COLORS[part.priority])}>
              {PRIORITY_LABELS[part.priority]}
            </span>
            <span className="text-xs bg-surface-btn border border-rim-btn text-ink-muted px-2 py-0.5 rounded-sm">
              {STATUS_LABELS[part.status]}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Status stepper */}
        <section>
          <SectionLabel>Status</SectionLabel>
          <div className="flex items-center gap-0 flex-wrap">
            {ORDER.map((s, i) => {
              const active = s === part.status;
              const past = i < currentIdx;
              return (
                <div key={s} className="flex items-center">
                  <button
                    disabled={!canManage || statusMutation.isPending}
                    onClick={() => canManage && statusMutation.mutate(s)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors",
                      active
                        ? "bg-brand-600/20 border-brand-600 text-brand-400"
                        : past
                          ? "bg-green-500/10 border-green-500/40 text-green-400"
                          : "bg-surface-btn border-rim-btn text-ink-dim hover:bg-surface-hover",
                      !canManage && "cursor-default",
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                  {i < ORDER.length - 1 && (
                    <div className="w-3 h-px bg-rim mx-0.5" />
                  )}
                </div>
              );
            })}
          </div>
          {canManage && next && (
            <button
              onClick={() => statusMutation.mutate(next)}
              disabled={statusMutation.isPending}
              className="mt-2 text-xs text-brand-400 hover:text-brand-500 underline underline-offset-2 transition-colors"
            >
              {statusMutation.isPending ? "Updating…" : `Advance → ${STATUS_LABELS[next]}`}
            </button>
          )}
        </section>

        {/* Meta */}
        <section className="grid grid-cols-2 gap-3">
          <MetaCard label="Quantity">
            {part.quantityComplete} / {part.quantityRequired}
          </MetaCard>
          {part.material && <MetaCard label="Material">{part.material}</MetaCard>}
          {primaryOwner && (
            <MetaCard label="Machinist">{primaryOwner.user.displayName}</MetaCard>
          )}
          {part.owners.filter(o => o.role === "COLLABORATOR").map(o => (
            <MetaCard key={o.id} label="Collaborator">{o.user.displayName}</MetaCard>
          ))}
        </section>

        {/* Description */}
        {part.description && (
          <section>
            <SectionLabel>Description</SectionLabel>
            <p className="text-sm text-ink-muted leading-relaxed">{part.description}</p>
          </section>
        )}

        {/* Photos */}
        <section>
          <SectionLabel>Photos</SectionLabel>
          {part.photos.length === 0 ? (
            <p className="text-sm text-ink-dim">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {part.photos.map((photo) => (
                <div key={photo.id} className="aspect-square bg-surface-card border border-rim rounded-sm overflow-hidden">
                  <img
                    src={`/uploads/${photo.storageKey}`}
                    alt={photo.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {canManage && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                id="photo-upload"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="photo-upload"
                className="text-xs text-ink-dim border border-rim-btn rounded-sm px-3 py-1.5 cursor-pointer hover:bg-surface-hover transition-colors"
              >
                {photoFile ? photoFile.name : "Choose photo…"}
              </label>
              {photoFile && (
                <button
                  onClick={() => photoMutation.mutate(photoFile)}
                  disabled={photoMutation.isPending}
                  className="text-xs text-brand-400 hover:text-brand-500 transition-colors"
                >
                  {photoMutation.isPending ? "Uploading…" : "Upload"}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Event log */}
        {part.events.length > 0 && (
          <section>
            <SectionLabel>Activity</SectionLabel>
            <div className="space-y-1">
              {part.events.slice(0, 10).map((evt) => (
                <div key={evt.id} className="flex items-baseline gap-2 text-xs text-ink-dim">
                  <span className="text-ink-label font-mono">
                    {new Date(evt.createdAt).toLocaleDateString()}
                  </span>
                  <span>{evt.actor.displayName}</span>
                  <span className="text-ink-muted">{formatEventType(evt.eventType)}</span>
                  {evt.fromStatus && evt.toStatus && (
                    <span className="text-ink-dim">
                      {STATUS_LABELS[evt.fromStatus]} → {STATUS_LABELS[evt.toStatus]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-ink-label uppercase tracking-wider mb-2">{children}</div>
  );
}

function MetaCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-rim rounded-sm px-3 py-2">
      <div className="text-xs text-ink-dim mb-0.5">{label}</div>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

function formatEventType(type: string): string {
  return type.toLowerCase().replace(/_/g, " ");
}
