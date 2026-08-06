import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const demoMaterials = [
  // 1. RAW MATERIALS (Түүхий эд)
  { sku: 'RM-MILK-001', name: 'Үнээний шинэхэн сүү 3.2%', materialType: 'RAW_MATERIAL', unit: 'л', costPrice: 2800, unitPrice: 2800, stockQuantity: 1500, minStockLevel: 200, description: 'Завхан аймгийн малчдаас татан авсан цэвэр сүү' },
  { sku: 'RM-APPL-002', name: 'Шинэ хураасан алим (Завхан алим)', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 4200, unitPrice: 4200, stockQuantity: 850, minStockLevel: 100, description: 'Жимсний шүүс болон ундааны орц' },
  { sku: 'RM-FLOR-003', name: 'Улаан буудайн дээд зэргийн гурил', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 2200, unitPrice: 2200, stockQuantity: 2400, minStockLevel: 300, description: 'Үндсэн нарийн боовны түүхий эд' },
  { sku: 'RM-HNY-004', name: 'Цэвэр зөгийн балт мөнгөн ус', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 18500, unitPrice: 18500, stockQuantity: 320, minStockLevel: 50, description: 'Сэлэнгийн цэвэр зөгийн балт' },
  { sku: 'RM-JUIC-005', name: 'Малын шинэ махаар бэлтгэсэн нийлэг шүүс', materialType: 'RAW_MATERIAL', unit: 'л', costPrice: 5400, unitPrice: 5400, stockQuantity: 600, minStockLevel: 80, description: 'Шөл болон консервны орц' },
  { sku: 'RM-BUTR-006', name: 'Цэвэр шар тос (Сүүний)', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 24000, unitPrice: 24000, stockQuantity: 180, minStockLevel: 30, description: 'Сүүний уламжлалт цэвэр тос' },
  { sku: 'RM-EGGS-007', name: 'Шинэ өндөг (А ангилал)', materialType: 'RAW_MATERIAL', unit: 'ш', costPrice: 480, unitPrice: 480, stockQuantity: 4500, minStockLevel: 500, description: 'Нүүдэлчин шувууны өндөг' },
  { sku: 'RM-COCO-008', name: 'Какао нунтаг (Эквадор 100%)', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 16500, unitPrice: 16500, stockQuantity: 250, minStockLevel: 40, description: 'Шоколад ба амттаны орц' },
  { sku: 'RM-OIL-009', name: 'Цэвэр ургамлын тос (Наранцэцэг)', materialType: 'RAW_MATERIAL', unit: 'л', costPrice: 6200, unitPrice: 6200, stockQuantity: 950, minStockLevel: 150, description: 'Шаардлагатай тосны орц' },
  { sku: 'RM-SUGR-010', name: 'Атрын цагаан элсэн чихэр', materialType: 'RAW_MATERIAL', unit: 'кг', costPrice: 3800, unitPrice: 3800, stockQuantity: 1800, minStockLevel: 250, description: 'Чихрийн суурь орц' },

  // 2. PACKAGING (Сав баглаа боодол)
  { sku: 'PK-GLSS-001', name: 'Шилэн сав 500мл (Таглаатай)', materialType: 'PACKAGING', unit: 'ш', costPrice: 1200, unitPrice: 1200, stockQuantity: 3500, minStockLevel: 500, description: 'Шүүс болон чанамал савлах шил' },
  { sku: 'PK-CART-002', name: 'Гофро картон хайрцаг 24-тэй (Дунд)', materialType: 'PACKAGING', unit: 'ш', costPrice: 2400, unitPrice: 2400, stockQuantity: 1200, minStockLevel: 200, description: 'Тээвэрлэлтийн картон хайрцаг' },
  { sku: 'PK-VAC-003', name: 'Хүнсний зориулалттай вакуум уут 1кг', materialType: 'PACKAGING', unit: 'ш', costPrice: 350, unitPrice: 350, stockQuantity: 8000, minStockLevel: 1000, description: 'Үр болон борц вакуумдах уут' },
  { sku: 'PK-PET-004', name: 'PET Пласт лонх 1 литр', materialType: 'PACKAGING', unit: 'ш', costPrice: 650, unitPrice: 650, stockQuantity: 4200, minStockLevel: 600, description: 'Сүү болон ундааны пластик сав' },
  { sku: 'PK-ALU-005', name: 'Хөнгөн цагаан фольга уут 250г', materialType: 'PACKAGING', unit: 'ш', costPrice: 420, unitPrice: 420, stockQuantity: 6500, minStockLevel: 800, description: 'Кофэ болон цай савлах фольга уут' },
  { sku: 'PK-LBL-006', name: 'Бүтээгдэхүүний логотой стикер шошго', materialType: 'PACKAGING', unit: 'ш', costPrice: 180, unitPrice: 180, stockQuantity: 15000, minStockLevel: 2000, description: 'Лонх болон хайрцган дээрх наалт' },
  { sku: 'PK-STR-007', name: 'Термо хучлагын вүүлэн хальс (Stretch film)', materialType: 'PACKAGING', unit: 'ш', costPrice: 18500, unitPrice: 18500, stockQuantity: 85, minStockLevel: 15, description: 'Палетт таваг бэхлэх плёнка' },
  { sku: 'PK-PAP-008', name: 'Цаасан уут (Эко бор крафт)', materialType: 'PACKAGING', unit: 'ш', costPrice: 280, unitPrice: 280, stockQuantity: 9500, minStockLevel: 1200, description: 'Дэлгүүрийн крафт цаасан уут' },
  { sku: 'PK-CAP-009', name: 'Төмөр таглаа 82мм (Вакцинтай)', materialType: 'PACKAGING', unit: 'ш', costPrice: 220, unitPrice: 220, stockQuantity: 12000, minStockLevel: 1500, description: 'Шилэн савны металл таг' },
  { sku: 'PK-FOAM-010', name: 'Хөөсөнцөр хамгаалалтын хавтан (Блок)', materialType: 'PACKAGING', unit: 'ш', costPrice: 1400, unitPrice: 1400, stockQuantity: 600, minStockLevel: 100, description: 'Тээврийн доргилт хамгаалах хөөс' },

  // 3. AUXILIARY (Туслах материал)
  { sku: 'AX-VAN-001', name: 'Хүнсний амтлагч - Ванилин нунтаг', materialType: 'AUXILIARY', unit: 'кг', costPrice: 14500, unitPrice: 14500, stockQuantity: 45, minStockLevel: 10, description: 'Нарийн боовны үнэр оруулагч' },
  { sku: 'AX-CIT-002', name: 'Лимоны хүчил (Хүнсний E330)', materialType: 'AUXILIARY', unit: 'кг', costPrice: 8500, unitPrice: 8500, stockQuantity: 120, minStockLevel: 20, description: 'Амт тохируулагч болон нөөшлөгч' },
  { sku: 'AX-SODA-003', name: 'Хүнсний натри (Сода баяжмал)', materialType: 'AUXILIARY', unit: 'кг', costPrice: 3200, unitPrice: 3200, stockQuantity: 300, minStockLevel: 50, description: 'Хөөлгөгч натри' },
  { sku: 'AX-PEC-004', name: 'Байгалийн өтгөрүүлэгч пектин', materialType: 'AUXILIARY', unit: 'кг', costPrice: 28000, unitPrice: 28000, stockQuantity: 65, minStockLevel: 15, description: 'Жем, джем өтгөрүүлэгч' },
  { sku: 'AX-SALT-005', name: 'Йоджуулсан нарийн давс', materialType: 'AUXILIARY', unit: 'кг', costPrice: 1100, unitPrice: 1100, stockQuantity: 1500, minStockLevel: 200, description: 'Амтлагч давс' },
  { sku: 'AX-CLR-006', name: 'Байгалийн будгийн пигмент (Улаан)', materialType: 'AUXILIARY', unit: 'кг', costPrice: 32000, unitPrice: 32000, stockQuantity: 35, minStockLevel: 5, description: 'Жимсний ундааны өнгө оруулагч' },
  { sku: 'AX-STR-007', name: 'Хүнсний цардуул (Картофель)', materialType: 'AUXILIARY', unit: 'кг', costPrice: 4500, unitPrice: 4500, stockQuantity: 420, minStockLevel: 60, description: 'Шөл болон соус өтгөрүүлэгч' },
  { sku: 'AX-VIT-008', name: 'Амин дэмийн иж бүрдэл премикс', materialType: 'AUXILIARY', unit: 'кг', costPrice: 45000, unitPrice: 45000, stockQuantity: 25, minStockLevel: 5, description: 'Витаминжуулах бэлдмэл' },
  { sku: 'AX-FLT-009', name: 'Шүүлтүүрийн тусгай цаас (Paper sheet)', materialType: 'AUXILIARY', unit: 'ш', costPrice: 850, unitPrice: 850, stockQuantity: 2800, minStockLevel: 300, description: 'Шүүлтүүрийн дамжлагын цаас' },
  { sku: 'AX-YST-010', name: 'Хүнсний хөрөнгө бактерийн өртгөлт', materialType: 'AUXILIARY', unit: 'кг', costPrice: 52000, unitPrice: 52000, stockQuantity: 30, minStockLevel: 5, description: 'Сүү боловсруулах хөрөнгө' },

  // 4. SUPPLY (Хангамжийн материал)
  { sku: 'SP-CLN-001', name: 'Тоног төхөөрөмжийн цэвэрлэгээний ариутгагч шингэн', materialType: 'SUPPLY', unit: 'л', costPrice: 12500, unitPrice: 12500, stockQuantity: 180, minStockLevel: 30, description: 'Үйлдвэрийн шугам цэвэрлэх бодис' },
  { sku: 'SP-GLV-002', name: 'Ажилчдын нэг удаагийн хүнсний бээлий (Нитрил)', materialType: 'SUPPLY', unit: 'хайрцаг', costPrice: 14500, unitPrice: 14500, stockQuantity: 120, minStockLevel: 25, description: 'Ариун цэврийн бээлий' },
  { sku: 'SP-MSK-003', name: 'Хүнсний маск (3 давхаргатай)', materialType: 'SUPPLY', unit: 'хайрцаг', costPrice: 4800, unitPrice: 4800, stockQuantity: 250, minStockLevel: 40, description: 'Ажилтны нэг удаагийн маск' },
  { sku: 'SP-CAP-004', name: 'Ариун цэврийн малгай ба халаад', materialType: 'SUPPLY', unit: 'ш', costPrice: 1200, unitPrice: 1200, stockQuantity: 800, minStockLevel: 100, description: 'Үйлдвэрийн дотоод хувцас' },
  { sku: 'SP-LUB-005', name: 'Үйлдвэрийн шугамын конвейер тосолгооны тос', materialType: 'SUPPLY', unit: 'л', costPrice: 38000, unitPrice: 38000, stockQuantity: 40, minStockLevel: 10, description: 'Хүнсний тоног төхөөрөмжийн тос' },
  { sku: 'SP-TAPE-006', name: 'Лента скоч 50мм (Баглаа боодлын)', materialType: 'SUPPLY', unit: 'ш', costPrice: 2200, unitPrice: 2200, stockQuantity: 450, minStockLevel: 80, description: 'Хайрцаг бэхлэх скоч' },
  { sku: 'SP-LAB-007', name: 'Лабораторийн туршилтын хуруу шил', materialType: 'SUPPLY', unit: 'ш', costPrice: 3500, unitPrice: 3500, stockQuantity: 300, minStockLevel: 50, description: 'Чанарын шалгалтын шил' },
  { sku: 'SP-RIB-008', name: 'Термо принтерийн шошгоны тууз (Ribbon)', materialType: 'SUPPLY', unit: 'ш', costPrice: 16000, unitPrice: 16000, stockQuantity: 60, minStockLevel: 10, description: 'Баркод хэвлэгчийн лент' },
  { sku: 'SP-BOT-009', name: 'Үйлдвэрийн хүнсний резинэн гутал', materialType: 'SUPPLY', unit: 'хос', costPrice: 45000, unitPrice: 45000, stockQuantity: 35, minStockLevel: 5, description: 'Үйлдвэрийн ажлын гутал' },
  { sku: 'SP-SAN-010', name: 'Гар ариутгагч гел 5 литр', materialType: 'SUPPLY', unit: 'сав', costPrice: 28000, unitPrice: 28000, stockQuantity: 45, minStockLevel: 10, description: 'Дезинфектор гел' }
];

async function main() {
  console.log('Seeding 40 demo manufacturing materials...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of demoMaterials) {
    const existing = await prisma.product.findFirst({
      where: { sku: item.sku }
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: item
      });
      updatedCount++;
    } else {
      await prisma.product.create({
        data: item
      });
      createdCount++;
    }
  }

  console.log(`Successfully seeded! Created: ${createdCount}, Updated: ${updatedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
