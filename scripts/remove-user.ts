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

async function removeUser() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });

    if (users.length === 0) {
      console.log('\n❌ No users found');
      rl.close();
      process.exit(0);
    }

    console.log('\n👥 Current Users:\n');
    users.forEach((user, idx) => {
      const createdAt = user.createdAt.toLocaleDateString();
      console.log(`${idx + 1}. ${user.email} (${user.displayName}) - ${createdAt}`);
    });

    console.log(`\n0. Cancel\n`);

    const selection = await question('Select user to remove (number): ');
    const index = parseInt(selection) - 1;

    if (selection === '0' || isNaN(index)) {
      console.log('❌ Cancelled');
      rl.close();
      process.exit(0);
    }

    if (index < 0 || index >= users.length) {
      console.error('❌ Invalid selection');
      rl.close();
      process.exit(1);
    }

    const userToRemove = users[index];
    const confirm = await question(
      `\n⚠️  Delete ${userToRemove.email} (${userToRemove.displayName})? This will cascade delete all related data. (y/n): `
    );

    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      rl.close();
      process.exit(0);
    }

    await prisma.user.delete({
      where: { id: userToRemove.id },
    });

    console.log(`\n✅ User "${userToRemove.email}" deleted successfully`);
    rl.close();
  } catch (error) {
    console.error('❌ Error removing user:', error);
    rl.close();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeUser();
