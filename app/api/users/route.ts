import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { isLocalMode, isDemoMode } from "@/lib/app-mode";

export async function GET(request: NextRequest) {
  // In local/demo mode, the user picker is shown before login — allow unauthenticated access.
  if (!isLocalMode() && !isDemoMode()) {
    const userId = await requireUser(request);
    if (userId instanceof NextResponse) return userId;
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, avatarUrl: true },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({ users });
}
