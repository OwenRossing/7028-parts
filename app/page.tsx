import { redirect } from "next/navigation";

import { getUserIdFromCookieStore } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailAdmin } from "@/lib/admin";
import { Providers } from "@/components/providers";
import { PartsExplorer } from "@/components/parts-explorer";
import { NoProjectsScreen } from "@/components/parts-explorer/no-projects-screen";
import type { CurrentUser, ProjectSummary } from "@/types";

export default async function HomePage() {
  const userId = await getUserIdFromCookieStore();
  if (!userId) redirect("/login");

  const [user, projects] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, avatarUrl: true },
    }),
    prisma.project.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, createdAt: true },
    }),
  ]);

  if (!user) redirect("/login");

  const currentUser: CurrentUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    isAdmin: isEmailAdmin(user.email),
  };

  const serializedProjects: ProjectSummary[] = projects.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  if (serializedProjects.length === 0) {
    return (
      <Providers>
        <NoProjectsScreen currentUser={currentUser} />
      </Providers>
    );
  }

  return (
    <Providers>
      <PartsExplorer
        initialProjects={serializedProjects}
        currentUser={currentUser}
      />
    </Providers>
  );
}
