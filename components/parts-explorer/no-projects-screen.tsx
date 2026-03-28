"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProjectDialog } from "./create-project-dialog";
import type { CurrentUser } from "@/types";

interface NoProjectsScreenProps {
  currentUser: CurrentUser;
}

export function NoProjectsScreen({ currentUser }: NoProjectsScreenProps) {
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-page px-4">
      <div className="text-ink-dim text-5xl mb-6 select-none">⚙</div>

      <h1 className="text-ink text-lg font-medium mb-2">No projects yet</h1>

      {currentUser.isAdmin ? (
        <>
          <p className="text-ink-dim text-sm mb-6 text-center max-w-sm">
            Create your first project to get started. You can add parts, assign owners, and track manufacturing status from there.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 text-sm text-white bg-brand-600 hover:bg-brand-500 rounded-sm transition-colors"
          >
            + Create First Project
          </button>
          <a
            href="/settings"
            className="mt-3 text-xs text-ink-dim hover:text-ink transition-colors"
          >
            Team & settings →
          </a>
        </>
      ) : (
        <p className="text-ink-dim text-sm text-center max-w-sm">
          An admin needs to create a project before you can get started. Ask your team admin to set one up.
        </p>
      )}

      <div className="mt-10 flex items-center gap-2 text-xs text-ink-dim">
        {currentUser.avatarUrl && (
          <img src={currentUser.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
        )}
        <span>
          Signed in as <span className="text-ink">{currentUser.displayName}</span>
        </span>
        {currentUser.isAdmin && (
          <span className="px-1.5 py-0.5 bg-brand-600/20 text-brand-400 rounded text-[10px]">admin</span>
        )}
        <span>·</span>
        <a href="/api/auth/logout" className="hover:text-ink transition-colors">
          Sign out
        </a>
      </div>

      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
