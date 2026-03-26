import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { isAdminUser } from "@/lib/permissions";
import { broadcast } from "@/lib/sse-registry";
import { PartOwnerRole, PartEventType } from "@prisma/client";

type Params = { params: Promise<{ id: string; partId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { partId } = await params;
  const owners = await prisma.partOwner.findMany({
    where: { partId },
    select: {
      id: true, role: true, assignedAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
    },
  });

  return NextResponse.json({ owners });
}

const assignSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(PartOwnerRole),
});

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;

  const isAdmin = await isAdminUser(userId);
  const isPrimary = await prisma.partOwner.findFirst({
    where: { partId, userId, role: PartOwnerRole.PRIMARY },
    select: { id: true },
  });
  if (!isAdmin && !isPrimary) return jsonError("Forbidden.", 403);

  const parsed = await parseJson(request, assignSchema);
  if (!parsed.ok) return parsed.response;

  const owner = await prisma.partOwner.upsert({
    where: { partId_userId: { partId, userId: parsed.data.userId } },
    update: { role: parsed.data.role },
    create: { partId, userId: parsed.data.userId, role: parsed.data.role },
    select: { id: true, role: true, assignedAt: true, user: { select: { id: true, displayName: true } } },
  });

  await prisma.partEvent.create({
    data: { partId, actorUserId: userId, eventType: PartEventType.OWNER_ADDED, payloadJson: { targetUserId: parsed.data.userId, role: parsed.data.role } },
  });

  broadcast(projectId, { type: "part_updated", partId });

  return NextResponse.json({ owner }, { status: 201 });
}

const removeSchema = z.object({
  userId: z.string().min(1),
});

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;
  const isAdmin = await isAdminUser(userId);
  const isPrimary = await prisma.partOwner.findFirst({
    where: { partId, userId, role: PartOwnerRole.PRIMARY },
    select: { id: true },
  });
  if (!isAdmin && !isPrimary) return jsonError("Forbidden.", 403);

  const parsed = await parseJson(request, removeSchema);
  if (!parsed.ok) return parsed.response;

  await prisma.partOwner.deleteMany({ where: { partId, userId: parsed.data.userId } });

  await prisma.partEvent.create({
    data: { partId, actorUserId: userId, eventType: PartEventType.OWNER_REMOVED, payloadJson: { targetUserId: parsed.data.userId } },
  });

  broadcast(projectId, { type: "part_updated", partId });

  return NextResponse.json({ ok: true });
}
