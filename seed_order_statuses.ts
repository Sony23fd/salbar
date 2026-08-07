import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initialStatuses = [
  { code: 'PENDING', label: 'Хүлээгдэж буй', colorClass: 'bg-amber-100 text-amber-800 border-amber-200', orderIndex: 0, isSystem: true },
  { code: 'PROCESSING', label: 'Боловсруулж буй', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', orderIndex: 1, isSystem: false },
  { code: 'PACKED', label: 'Савлагдсан', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', orderIndex: 2, isSystem: false },
  { code: 'IN_TRANSIT', label: 'Тээвэрлэлтэд', colorClass: 'bg-purple-100 text-purple-800 border-purple-200', orderIndex: 3, isSystem: false },
  { code: 'DELIVERED', label: 'Хүргэгдсэн', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', orderIndex: 4, isSystem: true },
  { code: 'CANCELLED', label: 'Цуцлагдсан', colorClass: 'bg-red-100 text-red-800 border-red-200', orderIndex: 5, isSystem: true },
];

async function main() {
  console.log('Seeding order statuses...');
  for (const st of initialStatuses) {
    await prisma.orderStatusConfig.upsert({
      where: { code: st.code },
      update: {},
      create: st,
    });
  }
  console.log('Done seeding order statuses.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
