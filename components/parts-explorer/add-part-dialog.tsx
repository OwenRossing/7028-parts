"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/cn";

const schema = z.object({
  partNumber: z.string().min(1, "Required").max(50),
  name: z.string().min(1, "Required").max(200),
  description: z.string().optional(),
  material: z.string().optional(),
  quantityRequired: z.coerce.number().int().min(1),
  priority: z.coerce.number().int().min(0).max(3),
});

type FormValues = z.infer<typeof schema>;

interface AddPartDialogProps {
  projectId: string;
  onClose: () => void;
}

export function AddPartDialog({ projectId, onClose }: AddPartDialogProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantityRequired: 1, priority: 2 },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await fetch(`/api/projects/${projectId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to create part");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.parts.list(projectId) });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-surface-modal border border-rim-soft rounded-sm shadow-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rim-soft">
          <span className="text-sm font-medium text-ink">New Part</span>
          <button onClick={onClose} className="text-ink-dim hover:text-ink text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 space-y-4">
          {mutation.error && (
            <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
              {(mutation.error as Error).message}
            </div>
          )}

          <Field label="Part Number" error={errors.partNumber?.message}>
            <input {...register("partNumber")} placeholder="7028-26-1-3-001" className={inputCls} />
          </Field>

          <Field label="Name" error={errors.name?.message}>
            <input {...register("name")} placeholder="Intake roller bracket" className={inputCls} />
          </Field>

          <Field label="Material" error={errors.material?.message}>
            <input {...register("material")} placeholder="6061 Aluminum" className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" error={errors.quantityRequired?.message}>
              <input type="number" min="1" {...register("quantityRequired")} className={inputCls} />
            </Field>
            <Field label="Priority" error={errors.priority?.message}>
              <select {...register("priority")} className={inputCls}>
                <option value={0}>Critical</option>
                <option value={1}>High</option>
                <option value={2}>Normal</option>
                <option value={3}>Backburner</option>
              </select>
            </Field>
          </div>

          <Field label="Description" error={errors.description?.message}>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Optional notes…"
              className={cn(inputCls, "resize-none")}
            />
          </Field>

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
              disabled={mutation.isPending}
              className="flex-1 py-2 text-sm text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-sm transition-colors"
            >
              {mutation.isPending ? "Creating…" : "Create Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-ink-label uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-surface-card border border-rim rounded-sm px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-rim-brand";
