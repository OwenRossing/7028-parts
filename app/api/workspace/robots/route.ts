import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { isAdminUser } from "@/lib/permissions";

const createSchema = z.object({
  teamNumber: z.string().min(1),
  seasonYear: z.string().min(2).max(4),
  robotNumber: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;
  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const robot = await prisma.workspaceRobot.upsert({
    where: { teamNumber_seasonYear_robotNumber: parsed.data },
    update: {},
    create: parsed.data,
  });

  return NextResponse.json({ robot }, { status: 201 });
}
