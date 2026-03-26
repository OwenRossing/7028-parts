export const queryKeys = {
  me: ["me"] as const,
  users: ["users"] as const,
  projects: {
    all: ["projects"] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  parts: {
    list: (projectId: string, params?: string) => ["parts", projectId, params ?? ""] as const,
    detail: (partId: string) => ["parts", "detail", partId] as const,
  },
  workspace: ["workspace"] as const,
};
