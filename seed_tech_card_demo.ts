import { PrismaClient, MaterialType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Өмнөх өгөгдлийг цэвэрлэж байна...');
  
  // Төрөл бүрийн хамааралтай хүснэгтүүдийг цэвэрлэх (дарааллыг анхаарах)
  await prisma.orderItem.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.branchInventory.deleteMany();
  await prisma.productionBatchItem.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.bOMItem.deleteMany();
  await prisma.techCardStep.deleteMany();
  await prisma.bOM.deleteMany();
  await prisma.procurementItem.deleteMany();
  await prisma.procurement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log('Шинэ өгөгдөл оруулж байна...');

  // Ангилал үүсгэх
  const categoryMeat = await prisma.category.create({
    data: { name: 'Махан бүтээгдэхүүн', description: 'Бүх төрлийн махан бүтээгдэхүүн' }
  });
  const categorySpice = await prisma.category.create({
    data: { name: 'Амтлагч, хольц', description: 'Давс, перец гэх мэт' }
  });
  const categoryPackage = await prisma.category.create({
    data: { name: 'Сав баглаа', description: 'Уут, хайрцаг, шошго' }
  });

  // Түүхий эдүүд
  const beef = await prisma.product.create({
    data: {
      sku: 'RAW-BEEF-001',
      name: 'Үхрийн цэвэр мах',
      materialType: 'RAW_MATERIAL',
      unit: 'кг',
      unitPrice: 15000,
      costPrice: 15000,
      stockQuantity: 500,
      minStockLevel: 50,
      categoryId: categoryMeat.id
    }
  });

  const porkFat = await prisma.product.create({
    data: {
      sku: 'RAW-PORK-001',
      name: 'Гахайн өөх',
      materialType: 'RAW_MATERIAL',
      unit: 'кг',
      unitPrice: 8000,
      costPrice: 8000,
      stockQuantity: 200,
      minStockLevel: 20,
      categoryId: categoryMeat.id
    }
  });

  const spice = await prisma.product.create({
    data: {
      sku: 'AUX-SPICE-001',
      name: 'Зайдасны тусгай амтлагч, давс',
      materialType: 'AUXILIARY',
      unit: 'кг',
      unitPrice: 5000,
      costPrice: 5000,
      stockQuantity: 50,
      minStockLevel: 5,
      categoryId: categorySpice.id
    }
  });

  // Сав баглаа боодол
  const bag = await prisma.product.create({
    data: {
      sku: 'PKG-BAG-001',
      name: 'Вакум уут (Зайдас)',
      materialType: 'PACKAGING',
      unit: 'ш',
      unitPrice: 250,
      costPrice: 250,
      stockQuantity: 1000,
      minStockLevel: 100,
      categoryId: categoryPackage.id
    }
  });

  const label = await prisma.product.create({
    data: {
      sku: 'PKG-LBL-001',
      name: 'Шошго (Дээд зэргийн Зайдас)',
      materialType: 'PACKAGING',
      unit: 'ш',
      unitPrice: 100,
      costPrice: 100,
      stockQuantity: 1000,
      minStockLevel: 100,
      categoryId: categoryPackage.id
    }
  });

  // Бэлэн бүтээгдэхүүн
  const sausage = await prisma.product.create({
    data: {
      sku: 'FG-SAUS-001',
      name: 'Дээд зэргийн Зайдас',
      materialType: 'FINISHED_GOOD',
      unit: 'кг',
      unitPrice: 25000,
      costPrice: 0, // BOM-оос бодогдоно
      stockQuantity: 0,
      minStockLevel: 10,
      categoryId: categoryMeat.id
    }
  });

  // Admin user ID олох (үйлдэл бүртгэхэд хэрэгтэй)
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  if (admin) {
    // Эхний үлдэгдлүүдийг Transaction дээр бүртгэх
    const products = [beef, porkFat, spice, bag, label];
    for (const p of products) {
      await prisma.inventoryTransaction.create({
        data: {
          productId: p.id,
          type: 'INBOUND',
          quantity: p.stockQuantity,
          previousStock: 0,
          newStock: p.stockQuantity,
          userId: admin.id,
          notes: 'Демо дата: Эхний үлдэгдэл'
        }
      });
    }
  }

  // Технологийн карт (BOM) үүсгэх
  const bom = await prisma.bOM.create({
    data: {
      finishedProductId: sausage.id,
      name: 'Дээд зэргийн Зайдас технологийн карт',
      description: 'Герман технологиор үйлдвэрлэсэн, дээд зэргийн үхрийн махтай зайдас',
      version: 'v1.0',
      isApproved: true,
      preparationTimeMinutes: 30,
      cookingTimeMinutes: 120,
      shelfLifeDays: 14,
      instructions: 'Түүхий эдийг хүлээж авахдаа температурыг шалгана. Өрөөний температур 12 градусаас бага байх ёстой.',
      allergens: ['Үхрийн мах', 'Шар буурцагны уураг'],
      items: {
        create: [
          { ingredientId: beef.id, quantityPerUnit: 0.7, itemCategory: 'RAW_MATERIAL' },
          { ingredientId: porkFat.id, quantityPerUnit: 0.2, itemCategory: 'RAW_MATERIAL' },
          { ingredientId: spice.id, quantityPerUnit: 0.05, itemCategory: 'AUXILIARY' },
          { ingredientId: bag.id, quantityPerUnit: 1, itemCategory: 'PACKAGING' },
          { ingredientId: label.id, quantityPerUnit: 1, itemCategory: 'PACKAGING' }
        ]
      },
      steps: {
        create: [
          {
            stepNumber: 1,
            title: 'Мах татах',
            description: 'Үхрийн мах болон өөхийг 3мм тороор тус тусад нь татна.',
            timeMinutes: 15,
            equipmentNeeded: ['Махны машин (Волчок)']
          },
          {
            stepNumber: 2,
            title: 'Холих, Амтлах',
            description: 'Татсан махыг амтлагчтай хольж 0-4 градуст 30 минут амраана.',
            timeMinutes: 30,
            temperature: 4,
            equipmentNeeded: ['Мах холигч']
          },
          {
            stepNumber: 3,
            title: 'Мах шахах, Утах',
            description: 'Бэлтгэсэн татшийг зориулалтын бүрхүүлд шахаж утах шүүгээнд хийнэ.',
            timeMinutes: 90,
            temperature: 75,
            equipmentNeeded: ['Шахагч (Шприц)', 'Утлагын шүүгээ']
          },
          {
            stepNumber: 4,
            title: 'Хөргөх, Савлах',
            description: 'Бэлэн болсон зайдсыг хөргөж, вакум уутанд савлан шошго наана.',
            timeMinutes: 15,
            equipmentNeeded: ['Вакум савлагч', 'Хөргөгч']
          }
        ]
      }
    }
  });

  // Зайдсын өртгийг тооцож шинэчлэх
  const rawCost = (0.7 * 15000) + (0.2 * 8000) + (0.05 * 5000);
  const pkgCost = (1 * 250) + (1 * 100);
  const unitCost = rawCost + pkgCost;

  await prisma.bOM.update({
    where: { id: bom.id },
    data: { calculatedUnitCost: unitCost }
  });

  await prisma.product.update({
    where: { id: sausage.id },
    data: { costPrice: unitCost }
  });

  console.log('Амжилттай! Демо датаг оруулж дууслаа.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
