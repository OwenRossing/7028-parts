import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { isAdminUser } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;
  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  const users = await prisma.user.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  });

  return NextResponse.json({ users });
}

const createSchema = z.object({
  email: z.string().email("Invalid email"),
  displayName: z.string().min(1, "Required").max(100),
});

export async function POST(request: NextRequest) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;
  if (!(await isAdminUser(userId))) return jsonError("Admin required.", 403);

  const parsed = await parseJson(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const user = await prisma.user.upsert({
    where: { email: parsed.data.email },
    update: { displayName: parsed.data.displayName },
    create: { email: parsed.data.email, displayName: parsed.data.displayName },
    select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
