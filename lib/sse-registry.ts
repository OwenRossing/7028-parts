/**
 * In-memory SSE client registry.
 *
 * Each project has a set of active SSE response controllers.
 * API mutations call `broadcast(projectId, event)` after committing changes.
 * Clients subscribe via GET /api/projects/[id]/events (Node.js runtime only).
 */

export type SSEEvent =
  | { type: "part_created"; partId: string }
  | { type: "part_updated"; partId: string }
  | { type: "part_deleted"; partId: string }
  | { type: "batch_committed"; batchId: string };

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const registry = new Map<string, Set<SSEController>>();

export function subscribe(projectId: string, controller: SSEController): () => void {
  if (!registry.has(projectId)) {
    registry.set(projectId, new Set());
  }
  registry.get(projectId)!.add(controller);

  return () => {
    registry.get(projectId)?.delete(controller);
    if (registry.get(projectId)?.size === 0) {
      registry.delete(projectId);
    }
  };
}

export function broadcast(projectId: string, event: SSEEvent): void {
  const clients = registry.get(projectId);
  if (!clients || clients.size === 0) return;

  const encoded = new TextEncoder().encode(
    `data: ${JSON.stringify(event)}\n\n`,
  );

  for (const controller of clients) {
    try {
      controller.enqueue(encoded);
    } catch {
      // Client disconnected — will be cleaned up on close
    }
  }
}
