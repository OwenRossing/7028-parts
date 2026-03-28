import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function createUser() {
  try {
    console.log('\n📝 Create New User\n');

    const email = await question('Email: ');
    if (!email.trim()) {
      console.error('❌ Email is required');
      rl.close();
      process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.error(`❌ User with email "${email}" already exists`);
      rl.close();
      process.exit(1);
    }

    const displayName = await question('Display Name: ');
    if (!displayName.trim()) {
      console.error('❌ Display Name is required');
      rl.close();
      process.exit(1);
    }

    const makeAdmin = await question('Make admin? (y/n): ');
    const isAdmin = makeAdmin.toLowerCase() === 'y';

    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        displayName: displayName.trim(),
      },
    });

    console.log(`\n✅ User created successfully!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName}`);
    console.log(`   ID: ${user.id}`);

    if (isAdmin) {
      console.log(`\n⚠️  To make this user an admin, add their email to ADMIN_EMAILS in .env:`);
      console.log(`   ADMIN_EMAILS="${email}"`);
      console.log(`   (Or append to existing comma-separated list)`);
    }

    rl.close();
  } catch (error) {
    console.error('❌ Error creating user:', error);
    rl.close();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
