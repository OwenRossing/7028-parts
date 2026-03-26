import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { isEmailAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  if (!user) return jsonError("User not found.", 404);

  return NextResponse.json({ user: { ...user, isAdmin: isEmailAdmin(user.email) } });
}
