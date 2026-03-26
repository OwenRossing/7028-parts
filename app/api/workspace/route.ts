import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const team = await prisma.workspaceTeam.findFirst();
  const teamNumber = team?.teamNumber ?? null;

  if (!teamNumber) {
    return NextResponse.json({ team: null, robots: [], subsystems: [] });
  }

  const [robots, subsystems] = await Promise.all([
    prisma.workspaceRobot.findMany({
      where: { teamNumber },
      orderBy: [{ seasonYear: "desc" }, { robotNumber: "asc" }],
    }),
    prisma.workspaceSubsystem.findMany({
      where: { teamNumber },
      orderBy: [{ seasonYear: "desc" }, { robotNumber: "asc" }, { subsystemNumber: "asc" }],
    }),
  ]);

  return NextResponse.json({ team, robots, subsystems });
}
