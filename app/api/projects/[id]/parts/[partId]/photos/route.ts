import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { canManagePart, isAdminUser } from "@/lib/permissions";
import { broadcast } from "@/lib/sse-registry";
import { PartEventType } from "@prisma/client";
import { storageProvider } from "@/lib/storage";
import { env } from "@/lib/env";

type Params = { params: Promise<{ id: string; partId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;
  if (!(await canManagePart(userId, partId))) return jsonError("Forbidden.", 403);

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError("Invalid form data.", 400);

  const file = formData.get("file") as File | null;
  if (!file) return jsonError("No file provided.", 400);

  const maxBytes = (env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;
  if (file.size > maxBytes) return jsonError(`File exceeds ${env.MAX_UPLOAD_MB}MB limit.`, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const storage = storageProvider;
  const { storageKey } = await storage.save({
    bytes,
    originalName: file.name,
    mimeType: file.type,
  });

  const existingPhotos = await prisma.partPhoto.count({ where: { partId } });
  const isThumbnail = existingPhotos === 0;

  const photo = await prisma.partPhoto.create({
    data: {
      partId,
      storageKey,
      originalName: file.name,
      mimeType: file.type,
      isThumbnail,
      uploadedById: userId,
    },
    select: { id: true, storageKey: true, originalName: true, mimeType: true, isThumbnail: true, createdAt: true },
  });

  if (isThumbnail) {
    await prisma.partThumbnail.upsert({
      where: { partId },
      update: { storageKey },
      create: { partId, storageKey },
    });
  }

  await prisma.partEvent.create({
    data: { partId, actorUserId: userId, eventType: PartEventType.PHOTO_ADDED },
  });

  broadcast(projectId, { type: "part_updated", partId });

  return NextResponse.json({ photo }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId, partId } = await params;
  const photoId = request.nextUrl.searchParams.get("photoId");
  if (!photoId) return jsonError("photoId required.", 400);

  const photo = await prisma.partPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true, uploadedById: true },
  });
  if (!photo) return jsonError("Photo not found.", 404);

  const isAdmin = await isAdminUser(userId);
  if (!isAdmin && photo.uploadedById !== userId) return jsonError("Forbidden.", 403);

  const storage = storageProvider;
  await storage.delete(photo.storageKey).catch(() => undefined);
  await prisma.partPhoto.delete({ where: { id: photoId } });

  await prisma.partEvent.create({
    data: { partId, actorUserId: userId, eventType: PartEventType.PHOTO_DELETED },
  });

  broadcast(projectId, { type: "part_updated", partId });

  return NextResponse.json({ ok: true });
}
