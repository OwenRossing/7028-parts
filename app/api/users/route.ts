import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, avatarUrl: true },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({ users });
}
