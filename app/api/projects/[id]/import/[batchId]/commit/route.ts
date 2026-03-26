import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { broadcast } from "@/lib/sse-registry";
import { ImportBatchStatus, ImportRowAction, PartEventType } from "@prisma/client";

type Params = { params: Promise<{ id: string; batchId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, batchId } = await params;

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: true },
  });
  if (!batch) return jsonError("Batch not found.", 404);
  if (batch.projectId !== projectId) return jsonError("Batch not found.", 404);
  if (batch.status !== ImportBatchStatus.PREVIEW) return jsonError("Batch already committed.", 409);

  const actionRows = batch.rows.filter((r) => r.action !== ImportRowAction.NO_CHANGE && r.action !== ImportRowAction.ERROR);

  await prisma.$transaction(async (tx) => {
    for (const row of actionRows) {
      if (row.action === ImportRowAction.CREATE && row.partNumber && row.name) {
        const part = await tx.part.create({
          data: {
            projectId,
            partNumber: row.partNumber,
            name: row.name,
            material: row.material ?? undefined,
            quantityRequired: row.quantityNeeded ?? 1,
          },
          select: { id: true },
        });
        await tx.importRow.update({
          where: { id: row.id },
          data: { resolvedPartId: part.id },
        });
        await tx.partEvent.create({
          data: { partId: part.id, actorUserId: userId, eventType: PartEventType.IMPORTED },
        });
      } else if (row.action === ImportRowAction.UPDATE && row.resolvedPartId) {
        await tx.part.update({
          where: { id: row.resolvedPartId },
          data: {
            ...(row.name ? { name: row.name } : {}),
            ...(row.material ? { material: row.material } : {}),
            ...(row.quantityNeeded ? { quantityRequired: row.quantityNeeded } : {}),
          },
        });
        await tx.partEvent.create({
          data: { partId: row.resolvedPartId, actorUserId: userId, eventType: PartEventType.IMPORTED },
        });
      }
    }

    await tx.importBatch.update({
      where: { id: batchId },
      data: { status: ImportBatchStatus.COMMITTED, completedAt: new Date() },
    });
  });

  broadcast(projectId, { type: "batch_committed", batchId });

  const committed = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { orderBy: { rowIndex: "asc" } } },
  });

  return NextResponse.json({ batch: committed });
}
