const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(u => {
  console.log(u.map(x => ({ email: x.email, role: x.role, isActive: x.isActive })));
}).catch(console.error).finally(() => prisma.$disconnect());
