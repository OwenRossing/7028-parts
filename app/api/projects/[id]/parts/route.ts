import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { broadcast } from "@/lib/sse-registry";
import { type Prisma, PartStatus, PartEventType, PartOwnerRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const PART_SELECT = {
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
  thumbnail: { select: { storageKey: true } },
} as const;

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId } = await params;
  const { searchParams } = request.nextUrl;

  const where: Prisma.PartWhereInput = { projectId };

  const status = searchParams.get("status");
  if (status) {
    const statuses = status.split(",").filter((s) => s in PartStatus) as PartStatus[];
    if (statuses.length) where.status = { in: statuses };
  }

  const priority = searchParams.get("priority");
  if (priority) {
    const priorities = priority.split(",").map(Number).filter((n) => !isNaN(n));
    if (priorities.length) where.priority = { in: priorities };
  }

  const q = searchParams.get("q");
  if (q?.trim()) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { partNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const parts = await prisma.part.findMany({
    where,
    select: PART_SELECT,
    orderBy: [{ priority: "asc" }, { partNumber: "asc" }],
  });

  return NextResponse.json({ parts });
}

const createSchema = z.object({
  partNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  material: z.string().optional(),
  status: z.nativeEnum(PartStatus).optional(),
  quantityRequired: z.number().int().min(1).optional(),
  priority: z.number().int().min(0).max(3).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId } = await params;

  const projectExists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!projectExists) return jsonError("Project not found.", 404);

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const existing = await prisma.part.findUnique({
    where: { projectId_partNumber: { projectId, partNumber: parsed.data.partNumber } },
    select: { id: true },
  });
  if (existing) return jsonError("Part number already exists in this project.", 409);

  const part = await prisma.part.create({
    data: { projectId, ...parsed.data },
    select: PART_SELECT,
  });

  await prisma.partEvent.create({
    data: {
      partId: part.id,
      actorUserId: userId,
      eventType: PartEventType.CREATED,
      toStatus: part.status,
    },
  });

  broadcast(projectId, { type: "part_created", partId: part.id });

  return NextResponse.json({ part }, { status: 201 });
}
