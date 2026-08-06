import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo finance user (finance@wms.app)...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const existing = await prisma.user.findUnique({
    where: { email: 'finance@wms.app' }
  });

  if (existing) {
    await prisma.user.update({
      where: { email: 'finance@wms.app' },
      data: {
        name: 'Санхүүгийн ажилтан',
        role: 'FINANCE',
        password: hashedPassword,
        isActive: true
      }
    });
    console.log('Finance user updated successfully.');
  } else {
    await prisma.user.create({
      data: {
        name: 'Санхүүгийн ажилтан',
        email: 'finance@wms.app',
        role: 'FINANCE',
        password: hashedPassword,
        isActive: true
      }
    });
    console.log('Finance user created successfully.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
