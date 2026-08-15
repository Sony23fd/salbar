import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'dataadmin@system.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`Seeding DATA_ADMIN user: ${email}...`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`DATA_ADMIN user already exists! Updating password and role...`);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'DATA_ADMIN' as any,
        isActive: true,
      },
    });
    console.log('Updated existing DATA_ADMIN user.');
  } else {
    await prisma.user.create({
      data: {
        name: 'System Data Admin',
        email,
        password: hashedPassword,
        role: 'DATA_ADMIN' as any,
        permissions: [],
        isActive: true,
      },
    });
    console.log('Created new DATA_ADMIN user.');
  }

  console.log('DATA_ADMIN seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
