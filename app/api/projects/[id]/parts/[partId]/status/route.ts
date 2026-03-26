import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { canManagePart } from "@/lib/permissions";
import { broadcast } from "@/lib/sse-registry";
import { PartStatus, PartEventType } from "@prisma/client";

type Params = { params: Promise<{ id: string; partId: string }> };

const bodySchema = z.object({
  status: z.nativeEnum(PartStatus),
});

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;
  if (!(await canManagePart(userId, partId))) return jsonError("Forbidden.", 403);

  const parsed = await parseJson(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  const current = await prisma.part.findUnique({ where: { id: partId }, select: { status: true } });
  if (!current) return jsonError("Part not found.", 404);

  const part = await prisma.part.update({
    where: { id: partId },
    data: { status: parsed.data.status },
    select: { id: true, status: true, updatedAt: true },
  });

  await prisma.partEvent.create({
    data: {
      partId,
      actorUserId: userId,
      eventType: PartEventType.STATUS_CHANGED,
      fromStatus: current.status,
      toStatus: parsed.data.status,
    },
  });

  broadcast(projectId, { type: "part_updated", partId });

  return NextResponse.json({ part });
}
