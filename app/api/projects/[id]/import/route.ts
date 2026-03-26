import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, requireUser, parseJson } from "@/lib/api";
import { ImportRowAction } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// CSV-only PREVIEW: parse the uploaded CSV and create an ImportBatch in PREVIEW state.
// Each row is compared against existing parts (by partNumber) to determine CREATE vs UPDATE vs NO_CHANGE.

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]));
  });
}

const onshapeBodySchema = z.object({
  sourceType: z.literal("onshape_api"),
  documentId: z.string().min(1),
  workspaceId: z.string().min(1),
  elementId: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await requireUser(request);
  if (userId instanceof NextResponse) return userId;

  const { id: projectId } = await params;

  const projectExists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!projectExists) return jsonError("Project not found.", 404);

  const contentType = request.headers.get("content-type") ?? "";
  let fileName = "import.csv";
  let sourceType = "csv";
  let rows: { partNumber?: string; name?: string; material?: string; quantityNeeded?: number }[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    if (!formData) return jsonError("Invalid form data.", 400);
    const file = formData.get("file") as File | null;
    if (!file) return jsonError("No file provided.", 400);
    fileName = file.name;
    const text = await file.text();
    const parsed = parseCSV(text);
    rows = parsed.map((r) => ({
      partNumber: r["part_number"] || r["partnumber"] || r["number"] || undefined,
      name: r["name"] || r["part_name"] || undefined,
      material: r["material"] || undefined,
      quantityNeeded: r["quantity"] || r["qty"] ? parseInt(r["quantity"] || r["qty"]) : undefined,
    }));
  } else {
    const bodyParsed = await parseJson(request, onshapeBodySchema);
    if (!bodyParsed.ok) return bodyParsed.response;
    sourceType = "onshape_api";
    fileName = `onshape-${bodyParsed.data.documentId}.json`;
    // Onshape import rows would be populated via lib/bom/onshape-provider.ts — stub for now
    rows = [];
  }

  // Fetch existing parts for this project
  const existingParts = await prisma.part.findMany({
    where: { projectId },
    select: { id: true, partNumber: true, name: true, material: true, quantityRequired: true },
  });
  const byPartNumber = new Map(existingParts.map((p) => [p.partNumber, p]));

  const batch = await prisma.importBatch.create({
    data: {
      projectId,
      sourceType,
      fileName,
      startedById: userId,
      rows: {
        create: rows.map((row, i) => {
          const existing = row.partNumber ? byPartNumber.get(row.partNumber) : undefined;
          let action: ImportRowAction = ImportRowAction.CREATE;
          if (existing) {
            const changed =
              (row.name && row.name !== existing.name) ||
              (row.material && row.material !== existing.material) ||
              (row.quantityNeeded && row.quantityNeeded !== existing.quantityRequired);
            action = changed ? ImportRowAction.UPDATE : ImportRowAction.NO_CHANGE;
          }
          if (!row.partNumber || !row.name) {
            action = ImportRowAction.ERROR;
          }
          return {
            rowIndex: i,
            partNumber: row.partNumber,
            name: row.name,
            material: row.material,
            quantityNeeded: row.quantityNeeded,
            action,
            errorMessage: action === ImportRowAction.ERROR ? "Missing partNumber or name" : null,
            resolvedPartId: existing?.id ?? null,
            rawJson: row as object,
          };
        }),
      },
    },
    include: { rows: true },
  });

  return NextResponse.json({ batch }, { status: 201 });
}
