import type { PartStatus, PartOwnerRole } from "@prisma/client";

export type { PartStatus, PartOwnerRole };

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CurrentUser extends UserSummary {
  isAdmin: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  season: string;
  createdAt: string;
}

export interface OwnerSummary {
  id: string;
  role: PartOwnerRole;
  assignedAt: string;
  user: UserSummary;
}

export interface PartSummary {
  id: string;
  projectId: string;
  partNumber: string;
  name: string;
  description: string | null;
  material: string | null;
  status: PartStatus;
  quantityRequired: number;
  quantityComplete: number;
  priority: number;
  onshapeDocumentId: string | null;
  onshapeWorkspaceId: string | null;
  onshapeElementId: string | null;
  onshapePartId: string | null;
  createdAt: string;
  updatedAt: string;
  owners: OwnerSummary[];
  thumbnail: { storageKey: string } | null;
}

export interface PartDetail extends PartSummary {
  photos: {
    id: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    isThumbnail: boolean;
    createdAt: string;
  }[];
  events: {
    id: string;
    eventType: string;
    fromStatus: PartStatus | null;
    toStatus: PartStatus | null;
    payloadJson: unknown;
    createdAt: string;
    actor: { id: string; displayName: string };
  }[];
}

export type GroupBy = "none" | "status" | "priority" | "student";
export type TabView = "home" | "todo" | "filters";

export const PRIORITY_LABELS: Record<number, string> = {
  0: "Critical",
  1: "High",
  2: "Normal",
  3: "Backburner",
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: "text-red-400",
  1: "text-orange-400",
  2: "text-yellow-400",
  3: "text-blue-400",
};

export const PRIORITY_BORDER_COLORS: Record<number, string> = {
  0: "border-red-500 bg-red-500/10",
  1: "border-orange-500 bg-orange-500/10",
  2: "border-yellow-500 bg-yellow-500/10",
  3: "border-blue-500/60 bg-blue-500/10",
};

export const STATUS_LABELS: Record<PartStatus, string> = {
  DESIGNED: "Designed",
  CUT: "Cut",
  MACHINED: "Machined",
  ASSEMBLED: "Assembled",
  VERIFIED: "Verified",
  DONE: "Done",
};

export const STATUS_ORDER: PartStatus[] = [
  "DESIGNED",
  "CUT",
  "MACHINED",
  "ASSEMBLED",
  "VERIFIED",
  "DONE",
];
