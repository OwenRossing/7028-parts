import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { PartStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, season: true, createdAt: true },
  });
  if (!project) return jsonError("Project not found.", 404);

  const statusCounts = await prisma.part.groupBy({
    by: ["status"],
    where: { projectId: id },
    _count: { id: true },
  });

  const counts = Object.fromEntries(
    Object.values(PartStatus).map((s) => [s, 0]),
  ) as Record<PartStatus, number>;
  for (const row of statusCounts) {
    counts[row.status] = row._count.id;
  }

  return NextResponse.json({ project, counts });
}
