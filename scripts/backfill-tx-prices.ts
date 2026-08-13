import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill for InventoryTransaction prices...');
  
  // Get all transactions that don't have a unitPrice
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      unitPrice: null
    },
    include: {
      product: true
    }
  });

  console.log(`Found ${transactions.length} transactions to update.`);

  let updatedCount = 0;
  for (const tx of transactions) {
    if (tx.product) {
      // Determine the best price to use
      // Usually, costPrice > 0 ? costPrice : unitPrice is what the frontend used
      const costPrice = Number(tx.product.costPrice) || 0;
      const unitPrice = Number(tx.product.unitPrice) || 0;
      const priceToUse = costPrice > 0 ? costPrice : unitPrice;

      const totalPrice = Math.abs(tx.quantity) * priceToUse;

      await prisma.inventoryTransaction.update({
        where: { id: tx.id },
        data: {
          unitPrice: priceToUse,
          totalPrice: totalPrice
        }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} transactions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
