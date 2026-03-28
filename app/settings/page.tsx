import { redirect } from "next/navigation";

import { getUserIdFromCookieStore } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailAdmin } from "@/lib/admin";
import { Providers } from "@/components/providers";
import { SettingsClient } from "@/components/settings/settings-client";
import type { CurrentUser } from "@/types";

export type SettingsUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export type SettingsProject = {
  id: string;
  name: string;
  season: string;
  partCount: number;
};

export default async function SettingsPage() {
  const userId = await getUserIdFromCookieStore();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });

  if (!user) redirect("/login");

  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    isAdmin: isEmailAdmin(user.email),
  };

  let allUsers: SettingsUser[] | null = null;
  let allProjects: SettingsProject[] | null = null;

  if (currentUser.isAdmin) {
    const [dbUsers, dbProjects] = await Promise.all([
      prisma.user.findMany({
        orderBy: { displayName: "asc" },
        select: { id: true, email: true, displayName: true, avatarUrl: true },
      }),
      prisma.project.findMany({
        orderBy: [{ season: "desc" }, { name: "asc" }],
        select: { id: true, name: true, season: true, _count: { select: { parts: true } } },
      }),
    ]);

    allUsers = dbUsers.map((u) => ({
      ...u,
      isAdmin: isEmailAdmin(u.email),
    }));

    allProjects = dbProjects.map((p) => ({
      id: p.id,
      name: p.name,
      season: p.season,
      partCount: p._count.parts,
    }));
  }

  return (
    <Providers>
      <SettingsClient
        currentUser={currentUser}
        allUsers={allUsers}
        allProjects={allProjects}
      />
    </Providers>
  );
}
