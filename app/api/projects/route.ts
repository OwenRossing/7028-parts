import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { isAdminUser } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const projects = await prisma.project.findMany({
    orderBy: [{ season: "desc" }, { name: "asc" }],
    select: { id: true, name: true, season: true, createdAt: true },
  });

  return NextResponse.json({ projects });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  season: z.string().min(1).max(10),
});

export async function POST(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const project = await prisma.project.create({
    data: parsed.data,
    select: { id: true, name: true, season: true, createdAt: true },
  });

  return NextResponse.json({ project }, { status: 201 });
}
