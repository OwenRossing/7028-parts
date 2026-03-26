import { NextRequest, NextResponse } from "next/server";
import { revokeAuthSession, clearAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await revokeAuthSession(request);
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
