"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Required").max(100),
  season: z.string().min(1, "Required").max(10),
});

type FormValues = z.infer<typeof schema>;

interface CreateProjectDialogProps {
  onClose: () => void;
  onCreated: (project: { id: string; name: string; season: string }) => void;
}

export function CreateProjectDialog({ onClose, onCreated }: CreateProjectDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { season: new Date().getFullYear().toString() },
  });

  async function onSubmit(data: FormValues) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to create project");
      }
      const { project } = await res.json() as { project: { id: string; name: string; season: string } };
      onCreated(project);
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-surface-modal border border-rim-soft rounded-sm shadow-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rim-soft">
          <span className="text-sm font-medium text-ink">New Project</span>
          <button onClick={onClose} className="text-ink-dim hover:text-ink text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs text-ink-label uppercase tracking-wider">Project Name</label>
            <input
              {...register("name")}
              placeholder="Reefscape Bot"
              className={inputCls}
              autoFocus
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-ink-label uppercase tracking-wider">Season Year</label>
            <input
              {...register("season")}
              placeholder="2026"
              className={inputCls}
            />
            {errors.season && <p className="text-red-400 text-xs">{errors.season.message}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-ink-muted border border-rim-btn rounded-sm hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2 text-sm text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-sm transition-colors"
            >
              {pending ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-surface-card border border-rim rounded-sm px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-rim-brand";
