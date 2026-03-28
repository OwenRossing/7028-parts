import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const users = [
    { email: "owen.rossing@stmarobotics.org", displayName: "Owen Rossing" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.displayName },
      create: u,
    });
  }

  console.log(`Seeded ${users.length} user(s).`);

  // Seed a demo project so fresh installs aren't dead on arrival
  const project = await prisma.project.upsert({
    where: { id: "seed-demo-project" },
    update: {},
    create: {
      id: "seed-demo-project",
      name: "Reefscape Bot",
      season: "2026",
    },
  });

  console.log(`Seeded project: ${project.name} (Season ${project.season})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
