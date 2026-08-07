import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true }
  });

  const boms = await prisma.bOM.findMany({
    include: {
      items: { include: { ingredient: true } }
    }
  });
  const bomMap = new Map(boms.map(b => [b.finishedProductId, b]));

  const procurements = await prisma.procurement.findMany({
    include: { items: true }
  });

  const productionBatches = await prisma.productionBatch.findMany({
    include: { items: true }
  });

  const deliveredOrders = await prisma.order.findMany({
    where: { status: 'DELIVERED' }
  });

  // 1. Inventory Valuation by Material Type
  const inventoryValuation = {
    RAW_MATERIAL: { count: 0, totalQuantity: 0, totalValue: 0 },
    PACKAGING: { count: 0, totalQuantity: 0, totalValue: 0 },
    AUXILIARY: { count: 0, totalQuantity: 0, totalValue: 0 },
    SUPPLY: { count: 0, totalQuantity: 0, totalValue: 0 },
    FINISHED_GOOD: { count: 0, totalQuantity: 0, totalValue: 0 },
  };

  products.forEach(p => {
    const mType = (p.materialType || 'FINISHED_GOOD') as keyof typeof inventoryValuation;
    const price = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.unitPrice);
    if (inventoryValuation[mType]) {
      inventoryValuation[mType].count += 1;
      inventoryValuation[mType].totalQuantity += p.stockQuantity;
      inventoryValuation[mType].totalValue += p.stockQuantity * price;
    }
  });

  // 3. Consolidated Totals
  const totalProcurementAmount = procurements.reduce((sum, pr) => sum + Number(pr.totalAmount), 0);
  const totalMaterialsIssuedCost = productionBatches.reduce((sum, pb) => sum + Number(pb.totalMaterialCost), 0);
  const totalFixedOverheadCost = productionBatches.reduce((sum, pb) => sum + Number(pb.fixedOverheadCost), 0);
  const totalNormalScrapLoss = productionBatches.reduce((sum, pb) => sum + Number(pb.normalScrapAmount), 0);
  const totalAbnormalScrapLoss = productionBatches.reduce((sum, pb) => sum + Number(pb.abnormalScrapAmount), 0);
  const totalScrapLoss = totalNormalScrapLoss + totalAbnormalScrapLoss;
  const totalProductionCost = productionBatches.reduce((sum, pb) => sum + Number(pb.totalProductionCost), 0);

  const totalDeliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const totalDeliveredBaseCost = deliveredOrders.reduce((sum, o) => sum + Number(o.baseTotalAmount || 0), 0);
  const totalDeliveredNetProfit = deliveredOrders.reduce((sum, o) => sum + Number(o.marginProfit || 0), 0);

  console.log({
    inventoryValuation,
    summary: {
      totalProcurementAmount,
      totalMaterialsIssuedCost,
      totalFixedOverheadCost,
      totalNormalScrapLoss,
      totalAbnormalScrapLoss,
      totalScrapLoss,
      totalProductionCost,
      totalDeliveredRevenue,
      totalDeliveredBaseCost,
      totalDeliveredNetProfit
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
