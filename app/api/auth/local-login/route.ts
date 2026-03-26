import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createAuthSession } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { isLocalMode, isDemoMode } from "@/lib/app-mode";

const bodySchema = z.object({
  masterKey: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isLocalMode() && !isDemoMode()) {
    return jsonError("Local login is not available in production mode.", 403);
  }

  const parsed = await parseJson(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { masterKey, userId } = parsed.data;

  if (!env.LOCAL_MASTER_KEY || masterKey !== env.LOCAL_MASTER_KEY) {
    return jsonError("Invalid master key.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  if (!user) return jsonError("User not found.", 404);

  const response = NextResponse.json({ user });
  await createAuthSession(response, user.id, request.headers.get("user-agent"));
  return response;
}
