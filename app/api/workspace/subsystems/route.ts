import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { isAdminUser } from "@/lib/permissions";

const createSchema = z.object({
  teamNumber: z.string().min(1),
  seasonYear: z.string().min(2).max(4),
  robotNumber: z.string().min(1),
  subsystemNumber: z.string().min(1),
  label: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;
  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const { teamNumber, seasonYear, robotNumber, subsystemNumber, label } = parsed.data;
  const subsystem = await prisma.workspaceSubsystem.upsert({
    where: { teamNumber_seasonYear_robotNumber_subsystemNumber: { teamNumber, seasonYear, robotNumber, subsystemNumber } },
    update: { label: label ?? null },
    create: parsed.data,
  });

  return NextResponse.json({ subsystem }, { status: 201 });
}
