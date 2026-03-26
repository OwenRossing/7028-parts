import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { canManagePart, isAdminUser } from "@/lib/permissions";
import { broadcast } from "@/lib/sse-registry";
import { PartStatus, PartEventType } from "@prisma/client";

type Params = { params: Promise<{ id: string; partId: string }> };

const PART_FULL_SELECT = {
  id: true,
  projectId: true,
  partNumber: true,
  name: true,
  description: true,
  material: true,
  status: true,
  quantityRequired: true,
  quantityComplete: true,
  priority: true,
  onshapeDocumentId: true,
  onshapeWorkspaceId: true,
  onshapeElementId: true,
  onshapePartId: true,
  createdAt: true,
  updatedAt: true,
  owners: {
    select: {
      id: true,
      role: true,
      assignedAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
    },
  },
  photos: {
    select: { id: true, storageKey: true, originalName: true, mimeType: true, width: true, height: true, isThumbnail: true, createdAt: true },
    orderBy: { createdAt: "desc" as const },
  },
  thumbnail: { select: { storageKey: true } },
  events: {
    select: {
      id: true, eventType: true, fromStatus: true, toStatus: true, payloadJson: true, createdAt: true,
      actor: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
} as const;

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { partId } = await params;
  const part = await prisma.part.findUnique({ where: { id: partId }, select: PART_FULL_SELECT });
  if (!part) return jsonError("Part not found.", 404);

  return NextResponse.json({ part });
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  quantityRequired: z.number().int().min(1).optional(),
  quantityComplete: z.number().int().min(0).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  onshapeDocumentId: z.string().nullable().optional(),
  onshapeWorkspaceId: z.string().nullable().optional(),
  onshapeElementId: z.string().nullable().optional(),
  onshapePartId: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;
  if (!(await canManagePart(userId, partId))) return jsonError("Forbidden.", 403);

  const parsed = await parseJson(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const part = await prisma.part.update({
    where: { id: partId },
    data: parsed.data,
    select: PART_FULL_SELECT,
  });

  await prisma.partEvent.create({
    data: { partId, actorUserId: userId, eventType: PartEventType.UPDATED },
  });

  broadcast(projectId, { type: "part_updated", partId });

  return NextResponse.json({ part });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;
  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  await prisma.part.delete({ where: { id: partId } });

  broadcast(projectId, { type: "part_deleted", partId });

  return NextResponse.json({ ok: true });
}
