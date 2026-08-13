import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
  console.log('Starting data cleanup...');
  try {
    // List of business tables to truncate. We exclude 'users' and 'order_status_configs'.
    const tables = [
      'operating_expenses',
      'production_batch_items',
      'production_batches',
      'procurement_items',
      'procurements',
      'livestock_ledgers',
      'deboning_logs',
      'tech_card_steps',
      'bom_items',
      'boms',
      'task_comments',
      'tasks',
      'order_histories',
      'order_items',
      'orders',
      'inventory_transactions',
      'branch_inventory',
      'products',
      'categories',
      'branches'
    ];
    
    const tableList = tables.map(t => `"${t}"`).join(', ');

    console.log(`Executing TRUNCATE on tables: ${tableList}`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE;`);
    
    console.log('✅ All business data has been cleared completely (except users and system configs).');
  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
