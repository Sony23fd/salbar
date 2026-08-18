import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Demo Data Seeding...');

  // 1. Get an existing admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    throw new Error('Admin user not found. Please create an admin user first.');
  }
  const userId = admin.id;

  // 2. Clear all business data (if any)
  console.log('Clearing existing business data...');
  await prisma.operatingExpense.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.branchInventory.deleteMany();
  await prisma.productionBatchItem.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.bOMItem.deleteMany();
  await prisma.bOM.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.branch.deleteMany();

  // 3. Create Categories
  console.log('Creating categories...');
  const catFinished = await prisma.category.create({ data: { name: 'Бэлэн бүтээгдэхүүн', description: 'Бэйкери ба кофе' } });
  const catRaw = await prisma.category.create({ data: { name: 'Түүхий эд', description: 'Орц найрлага' } });
  const catPkg = await prisma.category.create({ data: { name: 'Сав баглаа', description: 'Уут, аяга' } });

  // 4. Create Branches
  console.log('Creating branches...');
  const branch1 = await prisma.branch.create({
    data: {
      name: 'Төв салбар (Coffee Shop)',
      location: 'СБД, 1-р хороо',
      profitPercent: 20,
      contactPerson: 'Менежер 1',
      email: 'branch1@demo.com',
      phone: '88776655'
    }
  });

  const branch2 = await prisma.branch.create({
    data: {
      name: 'Салбар дэлгүүр (Bakery)',
      location: 'ХУД, 15-р хороо',
      profitPercent: 30,
      contactPerson: 'Менежер 2',
      email: 'branch2@demo.com',
      phone: '88776644'
    }
  });

  // 5. Create Raw Materials
  console.log('Creating raw materials and packaging...');
  const rawFlour = await prisma.product.create({
    data: { sku: 'RAW-FLOUR', name: 'Гурил дээд', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 2500, unitPrice: 0, categoryId: catRaw.id, minStockLevel: 50, stockQuantity: 0 }
  });
  const rawSugar = await prisma.product.create({
    data: { sku: 'RAW-SUGAR', name: 'Элсэн чихэр', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 3500, unitPrice: 0, categoryId: catRaw.id, minStockLevel: 20, stockQuantity: 0 }
  });
  const rawMilk = await prisma.product.create({
    data: { sku: 'RAW-MILK', name: 'Сүү 3.2%', materialType: 'RAW_MATERIAL', unit: 'л', costPrice: 4000, unitPrice: 0, categoryId: catRaw.id, minStockLevel: 50, stockQuantity: 0 }
  });
  const rawCoffee = await prisma.product.create({
    data: { sku: 'RAW-COFFEE', name: 'Кофены үр (Arabica)', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 45000, unitPrice: 0, categoryId: catRaw.id, minStockLevel: 10, stockQuantity: 0 }
  });
  const rawChoco = await prisma.product.create({
    data: { sku: 'RAW-CHOCO', name: 'Шоколад (Dark)', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 25000, unitPrice: 0, categoryId: catRaw.id, minStockLevel: 10, stockQuantity: 0 }
  });
  const pkgCup = await prisma.product.create({
    data: { sku: 'PKG-CUP', name: 'Цаасан аяга таглаатай', materialType: 'PACKAGING', unit: 'ш', costPrice: 500, unitPrice: 0, categoryId: catPkg.id, minStockLevel: 500, stockQuantity: 0 }
  });
  const pkgBox = await prisma.product.create({
    data: { sku: 'PKG-BOX', name: 'Бэйкери хайрцаг', materialType: 'PACKAGING', unit: 'ш', costPrice: 800, unitPrice: 0, categoryId: catPkg.id, minStockLevel: 200, stockQuantity: 0 }
  });

  // 6. Procurement (Татан авалт)
  console.log('Procuring raw materials...');
  const procurements = [
    { prod: rawFlour, qty: 100 },
    { prod: rawSugar, qty: 50 },
    { prod: rawMilk, qty: 100 },
    { prod: rawCoffee, qty: 30 },
    { prod: rawChoco, qty: 20 },
    { prod: pkgCup, qty: 1000 },
    { prod: pkgBox, qty: 500 },
  ];

  for (const proc of procurements) {
    await prisma.product.update({
      where: { id: proc.prod.id },
      data: { stockQuantity: proc.qty }
    });
    await prisma.inventoryTransaction.create({
      data: {
        productId: proc.prod.id,
        type: 'INBOUND',
        quantity: proc.qty,
        previousStock: 0,
        newStock: proc.qty,
        userId: userId,
        unitPrice: Number(proc.prod.costPrice),
        totalPrice: Number(proc.prod.costPrice) * proc.qty,
        notes: 'Эхний татан авалт (Демо)',
      }
    });
  }

  // 7. Create Finished Goods
  console.log('Creating finished goods...');
  const fgMuffin = await prisma.product.create({
    data: { sku: 'FG-MUFFIN', name: 'Шоколадтай кекс', materialType: 'FINISHED_GOOD', unit: 'ш', costPrice: 0, unitPrice: 0, commissionPercent: 5, vatPercent: 10, categoryId: catFinished.id, stockQuantity: 0 }
  });
  const fgLatte = await prisma.product.create({
    data: { sku: 'FG-LATTE', name: 'Сүүтэй кофе (Latte)', materialType: 'FINISHED_GOOD', unit: 'аяга', costPrice: 0, unitPrice: 0, commissionPercent: 0, vatPercent: 10, categoryId: catFinished.id, stockQuantity: 0 }
  });
  const fgBread = await prisma.product.create({
    data: { sku: 'FG-BREAD', name: 'Энгийн талх', materialType: 'FINISHED_GOOD', unit: 'ш', costPrice: 0, unitPrice: 0, commissionPercent: 0, vatPercent: 0, categoryId: catFinished.id, stockQuantity: 0 }
  });
  const fgCoffeeBag = await prisma.product.create({
    data: { sku: 'FG-COFBAG', name: 'Кофены үр (Ууттай 250гр)', materialType: 'FINISHED_GOOD', unit: 'уут', costPrice: 0, unitPrice: 0, commissionPercent: 10, vatPercent: 10, categoryId: catFinished.id, stockQuantity: 0 }
  });
  const fgCookie = await prisma.product.create({
    data: { sku: 'FG-COOKIE', name: 'Амтат жигнэмэг', materialType: 'FINISHED_GOOD', unit: 'ш', costPrice: 0, unitPrice: 0, commissionPercent: 5, vatPercent: 10, categoryId: catFinished.id, stockQuantity: 0 }
  });

  // 8. Create BOMs
  console.log('Creating BOMs...');
  const createBom = async (finishedProductId: string, name: string, items: { ingId: string, qty: number }[]) => {
    const bom = await prisma.bOM.create({ data: { finishedProductId, name } });
    for (const item of items) {
      await prisma.bOMItem.create({
        data: { bomId: bom.id, ingredientId: item.ingId, quantityPerUnit: item.qty }
      });
    }
    return bom;
  };

  const bomMuffin = await createBom(fgMuffin.id, 'Үндсэн орц', [
    { ingId: rawFlour.id, qty: 0.08 },
    { ingId: rawSugar.id, qty: 0.02 },
    { ingId: rawChoco.id, qty: 0.03 },
    { ingId: rawMilk.id, qty: 0.05 },
    { ingId: pkgBox.id, qty: 1 } // 1 box for 1 muffin (example)
  ]);
  const bomLatte = await createBom(fgLatte.id, 'Үндсэн орц', [
    { ingId: rawCoffee.id, qty: 0.015 },
    { ingId: rawMilk.id, qty: 0.2 },
    { ingId: rawSugar.id, qty: 0.01 },
    { ingId: pkgCup.id, qty: 1 }
  ]);
  const bomBread = await createBom(fgBread.id, 'Үндсэн орц', [
    { ingId: rawFlour.id, qty: 0.3 },
    { ingId: rawSugar.id, qty: 0.01 },
    { ingId: rawMilk.id, qty: 0.1 }
  ]);
  const bomCoffeeBag = await createBom(fgCoffeeBag.id, 'Үндсэн орц', [
    { ingId: rawCoffee.id, qty: 0.25 },
    { ingId: pkgBox.id, qty: 1 }
  ]);
  const bomCookie = await createBom(fgCookie.id, 'Үндсэн орц', [
    { ingId: rawFlour.id, qty: 0.05 },
    { ingId: rawSugar.id, qty: 0.02 },
    { ingId: rawChoco.id, qty: 0.01 },
    { ingId: pkgBox.id, qty: 1 }
  ]);

  // 9. Run Production
  console.log('Running production...');
  const runProduction = async (bomId: string, qProduced: number, fgProd: any) => {
    const bom = await prisma.bOM.findUnique({ where: { id: bomId }, include: { items: { include: { ingredient: true } } } });
    if (!bom) return;

    let totalMaterialCost = 0;
    const batchItemsData = [];

    for (const bItem of bom.items) {
      const qUsed = bItem.quantityPerUnit * qProduced;
      const ing = bItem.ingredient;
      const price = Number(ing.costPrice) > 0 ? Number(ing.costPrice) : Number(ing.unitPrice);
      const cost = qUsed * price;
      totalMaterialCost += cost;

      await prisma.product.update({
        where: { id: ing.id },
        data: { stockQuantity: { decrement: qUsed } }
      });
      await prisma.inventoryTransaction.create({
        data: {
          productId: ing.id, type: 'OUTBOUND', quantity: -qUsed,
          previousStock: ing.stockQuantity, newStock: ing.stockQuantity - qUsed,
          userId, unitPrice: price, totalPrice: cost, notes: 'Үйлдвэрлэлд (Демо)'
        }
      });
      batchItemsData.push({ ingredientId: ing.id, quantityUsed: qUsed, unitPrice: price, totalPrice: cost });
    }

    // Overhead & Scrap
    const overhead = qProduced * 100; // 100₮ per item
    const normalScrap = 0;
    const abnormalScrap = 0;
    const totalProductionCost = totalMaterialCost + overhead + normalScrap + abnormalScrap;
    const calculatedUnitCost = totalProductionCost / qProduced;

    // Update FG
    await prisma.product.update({
      where: { id: fgProd.id },
      data: { stockQuantity: qProduced, costPrice: calculatedUnitCost }
    });
    
    await prisma.inventoryTransaction.create({
      data: {
        productId: fgProd.id, type: 'INBOUND', quantity: qProduced,
        previousStock: 0, newStock: qProduced,
        userId, unitPrice: calculatedUnitCost, totalPrice: totalProductionCost, notes: 'Үйлдвэрлэлээс орлого (Демо)'
      }
    });

    // Create Batch
    await prisma.productionBatch.create({
      data: {
        batchNumber: `PRD-${Date.now().toString().slice(-6)}`,
        finishedProductId: fgProd.id,
        quantityProduced: qProduced,
        fixedOverheadCost: overhead,
        normalScrapAmount: normalScrap,
        abnormalScrapAmount: abnormalScrap,
        totalMaterialCost,
        totalProductionCost,
        calculatedUnitCost,
        notes: 'Демо үйлдвэрлэл',
        items: { create: batchItemsData }
      }
    });
  };

  await runProduction(bomMuffin.id, 100, fgMuffin);
  await runProduction(bomLatte.id, 200, fgLatte);
  await runProduction(bomBread.id, 50, fgBread);
  await runProduction(bomCoffeeBag.id, 20, fgCoffeeBag);
  await runProduction(bomCookie.id, 150, fgCookie);

  // Reload FG to get updated costPrice
  const updatedMuffin = await prisma.product.findUnique({ where: { id: fgMuffin.id } });
  const updatedLatte = await prisma.product.findUnique({ where: { id: fgLatte.id } });
  const updatedBread = await prisma.product.findUnique({ where: { id: fgBread.id } });
  const updatedCoffeeBag = await prisma.product.findUnique({ where: { id: fgCoffeeBag.id } });
  const updatedCookie = await prisma.product.findUnique({ where: { id: fgCookie.id } });

  // 10. Dispatch to Branches
  console.log('Dispatching to branches...');
  const dispatchToBranch = async (branchId: string, prodId: string, qty: number) => {
    // Decrease from main warehouse
    await prisma.product.update({
      where: { id: prodId },
      data: { stockQuantity: { decrement: qty } }
    });

    // Add to branch inventory
    const bi = await prisma.branchInventory.findUnique({
      where: { branchId_productId: { branchId, productId: prodId } }
    });
    if (bi) {
      await prisma.branchInventory.update({
        where: { id: bi.id },
        data: { quantity: { increment: qty } }
      });
    } else {
      await prisma.branchInventory.create({
        data: { branchId, productId: prodId, quantity: qty }
      });
    }

    const prod = await prisma.product.findUnique({ where: { id: prodId } });
    await prisma.inventoryTransaction.create({
      data: {
        productId: prodId, type: 'OUTBOUND', quantity: -qty,
        previousStock: (prod?.stockQuantity || 0) + qty, newStock: prod?.stockQuantity || 0,
        userId, notes: 'Салбар руу шилжүүлсэн (Демо)'
      }
    });
  };

  await dispatchToBranch(branch1.id, updatedMuffin!.id, 30);
  await dispatchToBranch(branch1.id, updatedLatte!.id, 100);
  await dispatchToBranch(branch1.id, updatedBread!.id, 20);
  await dispatchToBranch(branch1.id, updatedCoffeeBag!.id, 5);
  await dispatchToBranch(branch1.id, updatedCookie!.id, 50);

  await dispatchToBranch(branch2.id, updatedMuffin!.id, 40);
  await dispatchToBranch(branch2.id, updatedLatte!.id, 50);
  await dispatchToBranch(branch2.id, updatedBread!.id, 25);
  await dispatchToBranch(branch2.id, updatedCoffeeBag!.id, 10);
  await dispatchToBranch(branch2.id, updatedCookie!.id, 80);

  // 11. Create Sales Orders at Branches
  console.log('Creating sales orders...');
  const createOrder = async (branch: any, items: { prod: any, qty: number }[]) => {
    let orderTotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const p = item.prod;
      const baseCost = Number(p.costPrice);
      const profitAmt = baseCost * (branch.profitPercent / 100);
      const costPlusProfit = baseCost + profitAmt;
      const commissionAmt = costPlusProfit * (p.commissionPercent / 100);
      const costPlusProfitPlusComm = costPlusProfit + commissionAmt;
      const vatAmt = costPlusProfitPlusComm * (p.vatPercent / 100);
      const effectivePrice = costPlusProfitPlusComm + vatAmt;

      const itemTotal = effectivePrice * item.qty;
      orderTotal += itemTotal;

      orderItemsData.push({
        productId: p.id,
        quantity: item.qty,
        unitPrice: effectivePrice,
        totalPrice: itemTotal
      });

      // Reduce branch inventory
      await prisma.branchInventory.update({
        where: { branchId_productId: { branchId: branch.id, productId: p.id } },
        data: { quantity: { decrement: item.qty } }
      });
    }

    await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        branchId: branch.id,
        createdById: userId,
        totalAmount: orderTotal,
        baseTotalAmount: orderTotal * 0.7,
        profitTotalAmount: orderTotal * 0.1,
        commissionTotalAmount: orderTotal * 0.1,
        vatTotalAmount: orderTotal * 0.1,
        status: 'DELIVERED',
        items: { create: orderItemsData }
      }
    });
  };

  // Branch 1 Orders
  await createOrder(branch1, [
    { prod: updatedMuffin, qty: 5 },
    { prod: updatedLatte, qty: 10 }
  ]);
  await createOrder(branch1, [
    { prod: updatedBread, qty: 2 },
    { prod: updatedCookie, qty: 8 }
  ]);
  
  // Branch 2 Orders
  await createOrder(branch2, [
    { prod: updatedCoffeeBag, qty: 1 },
    { prod: updatedMuffin, qty: 10 }
  ]);
  await createOrder(branch2, [
    { prod: updatedLatte, qty: 5 },
    { prod: updatedCookie, qty: 15 }
  ]);

  // 12. Create Expenses
  console.log('Creating expenses...');

  await prisma.operatingExpense.create({
    data: {
      type: 'Түрээс',
      amount: 150000,
      notes: 'Төв салбарын түрээс',
      expenseDate: new Date(),
      recordedById: userId
    }
  });
  await prisma.operatingExpense.create({
    data: {
      type: 'Цалин',
      amount: 80000,
      notes: 'Бариста цалин',
      expenseDate: new Date(),
      recordedById: userId
    }
  });

  console.log('✅ Demo data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
