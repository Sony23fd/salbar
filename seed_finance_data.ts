import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Санхүүгийн демо дата оруулж байна...');

  // 1. Get existing products and users
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Admin user not found');

  const beef = await prisma.product.findFirst({ where: { sku: 'RAW-BEEF-001' } });
  const porkFat = await prisma.product.findFirst({ where: { sku: 'RAW-PORK-001' } });
  const spice = await prisma.product.findFirst({ where: { sku: 'AUX-SPICE-001' } });
  const bag = await prisma.product.findFirst({ where: { sku: 'PKG-BAG-001' } });
  const label = await prisma.product.findFirst({ where: { sku: 'PKG-LBL-001' } });
  const sausage = await prisma.product.findFirst({ where: { sku: 'FG-SAUS-001' } });
  const bom = await prisma.bOM.findFirst({ where: { finishedProductId: sausage?.id } });
  const branch = await prisma.branch.findFirst({ where: { name: 'Төв салбар' } }); // Or any branch

  if (!beef || !porkFat || !spice || !bag || !label || !sausage || !bom) {
    throw new Error('Урьдчилсан дата олдсонгүй. Эхлээд seed_tech_card_demo.ts-г ажиллуулна уу.');
  }

  let testBranchId = branch?.id;
  if (!testBranchId) {
    const newBranch = await prisma.branch.create({
      data: {
        name: 'Номадс Төв Салбар',
        location: 'Улаанбаатар, СБД',
        contactPerson: 'Менежер',
        email: 'tov@nomads.mn',
        phone: '99112233',
        isActive: true,
      }
    });
    testBranchId = newBranch.id;
  }

  // 2. Create Procurement (Татан авалт)
  const procurementNo = `PROC-DEMO-${Date.now().toString().slice(-4)}`;
  const procItems = [
    { productId: beef.id, quantity: 200, unitPrice: 15000, totalPrice: 200 * 15000 },
    { productId: porkFat.id, quantity: 50, unitPrice: 8000, totalPrice: 50 * 8000 },
    { productId: spice.id, quantity: 10, unitPrice: 5000, totalPrice: 10 * 5000 },
    { productId: bag.id, quantity: 500, unitPrice: 250, totalPrice: 500 * 250 },
    { productId: label.id, quantity: 500, unitPrice: 100, totalPrice: 500 * 100 },
  ];
  const totalProcAmount = procItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const proc = await prisma.procurement.create({
    data: {
      procurementNo,
      supplierName: 'Номадс Ферм ХХК',
      notes: 'Санхүүгийн демо татан авалт',
      totalAmount: totalProcAmount,
      items: { create: procItems }
    }
  });
  console.log(`Татан авалт үүсгэлээ: ${proc.procurementNo} (Дүн: ₮${totalProcAmount})`);

  // 3. Create Production Batch (Үйлдвэрлэл)
  const batchNumber = `BATCH-DEMO-${Date.now().toString().slice(-4)}`;
  const qtyProduced = 100; // 100 kg of sausage
  const fixedOverhead = 50000;
  const normalScrap = 10000;
  const abnormalScrap = 5000;

  const batchItems = [
    { ingredientId: beef.id, quantityUsed: qtyProduced * 0.7, unitPrice: 15000, totalPrice: (qtyProduced * 0.7) * 15000 },
    { ingredientId: porkFat.id, quantityUsed: qtyProduced * 0.2, unitPrice: 8000, totalPrice: (qtyProduced * 0.2) * 8000 },
    { ingredientId: spice.id, quantityUsed: qtyProduced * 0.05, unitPrice: 5000, totalPrice: (qtyProduced * 0.05) * 5000 },
    { ingredientId: bag.id, quantityUsed: qtyProduced * 1, unitPrice: 250, totalPrice: (qtyProduced * 1) * 250 },
    { ingredientId: label.id, quantityUsed: qtyProduced * 1, unitPrice: 100, totalPrice: (qtyProduced * 1) * 100 },
  ];
  const totalMaterialCost = batchItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalProdCost = totalMaterialCost + fixedOverhead + normalScrap + abnormalScrap;
  const unitCost = totalProdCost / qtyProduced;

  const prodBatch = await prisma.productionBatch.create({
    data: {
      batchNumber,
      finishedProductId: sausage.id,
      quantityProduced: qtyProduced,
      fixedOverheadCost: fixedOverhead,
      normalScrapAmount: normalScrap,
      abnormalScrapAmount: abnormalScrap,
      totalMaterialCost,
      totalProductionCost: totalProdCost,
      calculatedUnitCost: unitCost,
      notes: 'Демо үйлдвэрлэл',
      items: {
        create: batchItems.map(i => ({
          ingredientId: i.ingredientId,
          quantityUsed: i.quantityUsed,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice
        }))
      }
    }
  });
  console.log(`Үйлдвэрлэл үүсгэлээ: ${prodBatch.batchNumber} (Өртөг: ₮${totalProdCost})`);

  // 4. Create Order & Delivery (Борлуулалт)
  const orderNumber = `ORD-DEMO-${Date.now().toString().slice(-4)}`;
  const orderQty = 50; // sell 50kg
  const sellPrice = 25000; // 25,000 per kg
  const baseCost = Number(unitCost) * orderQty;
  const totalSell = orderQty * sellPrice;
  const profit = totalSell - baseCost;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      branchId: testBranchId,
      status: 'DELIVERED',
      totalAmount: totalSell,
      baseTotalAmount: baseCost,
      marginProfit: profit,
      createdById: admin.id,
      deliveredById: admin.id,
      deliveredAt: new Date(),
      items: {
        create: [
          {
            productId: sausage.id,
            quantity: orderQty,
            unitPrice: sellPrice,
            totalPrice: totalSell
          }
        ]
      },
      history: {
        create: [
          {
            changedById: admin.id,
            status: 'PENDING',
            notes: 'Захиалга үүсгэв',
            itemsSnapshot: '[]'
          },
          {
            changedById: admin.id,
            status: 'DELIVERED',
            notes: 'Амжилттай хүргэгдэв',
            itemsSnapshot: '[]'
          }
        ]
      }
    }
  });
  console.log(`Борлуулалт үүсгэлээ: ${order.orderNumber} (Орлого: ₮${totalSell}, Ашиг: ₮${profit})`);

  // 5. Create an ADJUSTMENT (Агуулахын устгал/илүүдэл)
  await prisma.inventoryTransaction.create({
    data: {
      productId: sausage.id,
      type: 'ADJUSTMENT',
      quantity: -5,
      previousStock: 50,
      newStock: 45,
      userId: admin.id,
      notes: 'Чанар муудсан зайдас устгал (Санхүүгийн нөлөөллийг шалгах)'
    }
  });
  console.log('Агуулахын устгал үүсгэлээ (5 кг Зайдас)');

  console.log('Санхүүгийн дата амжилттай орлоо!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
