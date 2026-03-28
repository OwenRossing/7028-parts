"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProjectDialog } from "@/components/parts-explorer/create-project-dialog";
import type { CurrentUser } from "@/types";
import type { SettingsUser, SettingsProject } from "@/app/settings/page";

interface SettingsClientProps {
  currentUser: CurrentUser;
  allUsers: SettingsUser[] | null;
  allProjects: SettingsProject[] | null;
}

export function SettingsClient({ currentUser, allUsers, allProjects }: SettingsClientProps) {
  const router = useRouter();
  const [showCreateProject, setShowCreateProject] = useState(false);

  return (
    <div className="min-h-screen bg-surface-page">
      {/* Header */}
      <div className="border-b border-rim bg-surface-sidebar">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/" className="text-ink-dim hover:text-ink text-sm transition-colors">
            ← Parts
          </a>
          <span className="text-rim">/</span>
          <span className="text-ink text-sm font-medium">Settings</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

        {/* Profile */}
        <section>
          <h2 className="text-xs text-ink-label uppercase tracking-wider mb-3">Your Account</h2>
          <div className="bg-surface-card border border-rim rounded-sm p-4 flex items-center gap-4">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-11 h-11 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-surface-sidebar border border-rim flex items-center justify-center text-ink-dim text-lg flex-shrink-0">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-ink font-medium">{currentUser.displayName}</span>
                {currentUser.isAdmin && (
                  <span className="px-1.5 py-0.5 bg-brand-600/20 text-brand-400 rounded text-[10px] uppercase tracking-wider">
                    admin
                  </span>
                )}
              </div>
              <div className="text-ink-dim text-sm mt-0.5">{currentUser.email}</div>
            </div>
            <a
              href="/api/auth/logout"
              className="px-3 py-1.5 text-xs text-ink-muted border border-rim-btn rounded-sm hover:bg-surface-hover transition-colors flex-shrink-0"
            >
              Sign out
            </a>
          </div>
        </section>

        {/* Admin: Projects */}
        {currentUser.isAdmin && allProjects !== null && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs text-ink-label uppercase tracking-wider">Projects</h2>
              <button
                onClick={() => setShowCreateProject(true)}
                className="px-3 py-1.5 text-xs text-brand-400 border border-brand-600/40 hover:bg-brand-600/10 rounded-sm transition-colors"
              >
                + New Project
              </button>
            </div>
            <div className="bg-surface-card border border-rim rounded-sm divide-y divide-rim">
              {allProjects.length === 0 ? (
                <div className="px-4 py-8 text-center text-ink-dim text-sm">
                  No projects yet.{" "}
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Create one →
                  </button>
                </div>
              ) : (
                allProjects.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/?project=${p.id}`}
                        className="text-ink text-sm hover:text-brand-400 transition-colors"
                      >
                        {p.name}
                      </a>
                      <span className="text-ink-dim text-xs">Season {p.season}</span>
                    </div>
                    <span className="text-ink-dim text-xs">{p.partCount} parts</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Admin: Team Members */}
        {currentUser.isAdmin && allUsers !== null && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs text-ink-label uppercase tracking-wider">Team Members</h2>
            </div>
            <div className="bg-surface-card border border-rim rounded-sm divide-y divide-rim">
              {allUsers.map((u) => (
                <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-surface-sidebar border border-rim flex items-center justify-center text-[11px] text-ink-dim flex-shrink-0">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-ink text-sm">{u.displayName}</span>
                      {u.isAdmin && (
                        <span className="px-1.5 py-0.5 bg-brand-600/20 text-brand-400 rounded text-[10px] uppercase tracking-wider">
                          admin
                        </span>
                      )}
                    </div>
                    <div className="text-ink-dim text-xs mt-0.5">{u.email}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add member form */}
            <AddMemberForm onAdded={() => router.refresh()} />

            <p className="mt-3 text-xs text-ink-dim">
              Admin status is controlled via the{" "}
              <code className="text-ink-muted bg-surface-card px-1 py-0.5 rounded">ADMIN_EMAILS</code>{" "}
              environment variable. Members added here can log in via local mode.
            </p>
          </section>
        )}

        {/* Version */}
        <div className="text-xs text-ink-dim/40 pt-2">
          7028 Parts Tracker · v0.2.0
        </div>
      </div>

      {showCreateProject && (
        <CreateProjectDialog
          onClose={() => setShowCreateProject(false)}
          onCreated={() => {
            setShowCreateProject(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to add member");
      }
      setEmail("");
      setDisplayName("");
      setOpen(false);
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full py-2 text-xs text-ink-dim border border-dashed border-rim hover:border-rim-brand hover:text-ink rounded-sm transition-colors"
      >
        + Add team member
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 bg-surface-card border border-rim rounded-sm p-3 space-y-3">
      {error && (
        <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/30 rounded px-2 py-1.5">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          required
          className={inputCls}
          autoFocus
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className={inputCls}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="flex-1 py-1.5 text-xs text-ink-muted border border-rim-btn rounded-sm hover:bg-surface-hover transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-1.5 text-xs text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-sm transition-colors"
        >
          {pending ? "Adding…" : "Add Member"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full bg-surface-sidebar border border-rim rounded-sm px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-dim focus:outline-none focus:border-rim-brand";
