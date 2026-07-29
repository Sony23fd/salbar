import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    console.log(`Updated password for ${user.email}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
