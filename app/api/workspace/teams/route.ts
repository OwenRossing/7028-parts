import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { isAdminUser } from "@/lib/permissions";

const createSchema = z.object({ teamNumber: z.string().min(1).max(10) });

export async function POST(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;
  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const team = await prisma.workspaceTeam.upsert({
    where: { teamNumber: parsed.data.teamNumber },
    update: {},
    create: { teamNumber: parsed.data.teamNumber },
  });

  return NextResponse.json({ team }, { status: 201 });
}
