import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createAuthSession } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";

const bodySchema = z.object({
  idToken: z.string().min(1),
});

interface GoogleTokenInfo {
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  email_verified?: string;
  error_description?: string;
}

export async function POST(request: NextRequest) {
  const parsed = await parseJson(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { idToken } = parsed.data;

  if (!env.GOOGLE_CLIENT_ID) {
    return jsonError("Google login is not configured.", 503);
  }

  const tokenRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  const tokenData: GoogleTokenInfo = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error_description) {
    return jsonError("Invalid Google token.", 401);
  }
  if (tokenData.aud !== env.GOOGLE_CLIENT_ID) {
    return jsonError("Token audience mismatch.", 401);
  }
  if (tokenData.email_verified !== "true") {
    return jsonError("Google email not verified.", 401);
  }

  const email = tokenData.email;
  const allowedDomain = env.GOOGLE_AUTH_DOMAIN?.trim();
  if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
    return jsonError(`Only @${allowedDomain} accounts are allowed.`, 403);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: tokenData.name ?? email.split("@")[0],
      avatarUrl: tokenData.picture ?? null,
    },
    create: {
      email,
      displayName: tokenData.name ?? email.split("@")[0],
      avatarUrl: tokenData.picture ?? null,
    },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });

  const response = NextResponse.json({ user });
  await createAuthSession(response, user.id, request.headers.get("user-agent"));
  return response;
}
