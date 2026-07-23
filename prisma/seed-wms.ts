import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("📦 WMS Demo өгөгдөл оруулж эхэллээ...")

  // 1. Салбарууд үүсгэх
  console.log("🏢 Салбарууд үүсгэж байна...")
  const branchesData = [
    { name: "Төв агуулах", address: "Сонгинохайрхан дүүрэг, 20-р хороо", type: "MAIN_WAREHOUSE", isActive: true },
    { name: "Салбар 1 (Зайсан)", address: "Хан-Уул дүүрэг, Зайсан скуэр", type: "STORE", isActive: true },
    { name: "Салбар 2 (Имарт)", address: "Баянзүрх дүүрэг, Имарт худалдааны төв", type: "STORE", isActive: true },
    { name: "Салбар 3 (Дархан)", address: "Дархан-Уул аймаг, Шинэ Дархан", type: "STORE", isActive: true },
  ]

  const branches = []
  for (const b of branchesData) {
    const branch = await db.branch.create({ data: b as any })
    branches.push(branch)
  }
  
  const mainBranch = branches[0]
  const branch1 = branches[1]
  const branch2 = branches[2]

  // 2. Бараанууд авах (өмнөх seed-ээс үүссэн бараанууд)
  const products = await db.product.findMany({ take: 3 })
  if (products.length === 0) {
    console.error("❌ Бараа олдсонгүй. Эхлээд үндсэн seed-ийг уншуулна уу.")
    return
  }

  const user = await db.user.findFirst({ where: { role: "ADMIN" } })
  const userId = user ? user.id : ""

  // 3. Төв агуулах дээр эхний үлдэгдлүүд оруулах
  console.log("📦 Төв агуулахын үлдэгдэл үүсгэж байна...")
  for (const p of products) {
    await db.inventory.create({
      data: {
        branchId: mainBranch.id,
        productId: p.id,
        quantity: 500 // Төв агуулахад их хэмжээгээр байгаа
      }
    })
    
    // Анхны орлогын хөдөлгөөн
    await db.stockMovement.create({
      data: {
        branchId: mainBranch.id,
        productId: p.id,
        type: "IN",
        quantity: 500,
        note: "Анхны татан авалт"
      }
    })
  }

  // 4. Шилжүүлгүүд үүсгэх (Demo Scenario)
  console.log("🚚 Шилжүүлгүүд үүсгэж байна...")
  
  // 4.1. COMPLETED - Төвөөс -> Салбар 1 рүү амжилттай очсон
  const t1 = await db.stockTransfer.create({
    data: {
      referenceNumber: "TR-001",
      fromBranchId: mainBranch.id,
      toBranchId: branch1.id,
      status: "COMPLETED",
      note: "Ээлжит бараа таталт (Зайсан)",
      createdById: userId,
      items: {
        create: [
          { productId: products[0].id, quantity: 50, receivedQty: 50 },
          { productId: products[1].id, quantity: 30, receivedQty: 30 }
        ]
      }
    }
  })
  
  // Update inventory and movements for t1
  await db.inventory.updateMany({
    where: { branchId: mainBranch.id, productId: products[0].id },
    data: { quantity: { decrement: 50 } }
  })
  await db.inventory.updateMany({
    where: { branchId: mainBranch.id, productId: products[1].id },
    data: { quantity: { decrement: 30 } }
  })
  
  await db.inventory.create({ data: { branchId: branch1.id, productId: products[0].id, quantity: 50 } })
  await db.inventory.create({ data: { branchId: branch1.id, productId: products[1].id, quantity: 30 } })

  await db.stockMovement.create({ data: { branchId: mainBranch.id, productId: products[0].id, type: "TRANSFER_OUT", quantity: 50, transferId: t1.id } })
  await db.stockMovement.create({ data: { branchId: branch1.id, productId: products[0].id, type: "TRANSFER_IN", quantity: 50, transferId: t1.id } })
  await db.stockMovement.create({ data: { branchId: mainBranch.id, productId: products[1].id, type: "TRANSFER_OUT", quantity: 30, transferId: t1.id } })
  await db.stockMovement.create({ data: { branchId: branch1.id, productId: products[1].id, type: "TRANSFER_IN", quantity: 30, transferId: t1.id } })


  // 4.2. IN_TRANSIT - Төвөөс -> Салбар 2 руу илгээгдсэн, замд яваа (Үлдэгдэл хасагдсан)
  const t2 = await db.stockTransfer.create({
    data: {
      referenceNumber: "TR-002",
      fromBranchId: mainBranch.id,
      toBranchId: branch2.id,
      status: "IN_TRANSIT",
      note: "Яаралтай нөхөлт (Имарт)",
      createdById: userId,
      items: {
        create: [
          { productId: products[2].id, quantity: 20 },
          { productId: products[0].id, quantity: 15 }
        ]
      }
    }
  })
  
  await db.inventory.updateMany({
    where: { branchId: mainBranch.id, productId: products[2].id },
    data: { quantity: { decrement: 20 } }
  })
  await db.inventory.updateMany({
    where: { branchId: mainBranch.id, productId: products[0].id },
    data: { quantity: { decrement: 15 } }
  })
  
  await db.stockMovement.create({ data: { branchId: mainBranch.id, productId: products[2].id, type: "TRANSFER_OUT", quantity: 20, transferId: t2.id } })
  await db.stockMovement.create({ data: { branchId: mainBranch.id, productId: products[0].id, type: "TRANSFER_OUT", quantity: 15, transferId: t2.id } })


  // 4.3. PENDING - Салбар 1-ээс -> Салбар 2 руу шилжүүлэхээр үүссэн ч батлагдаагүй
  const t3 = await db.stockTransfer.create({
    data: {
      referenceNumber: "TR-003",
      fromBranchId: branch1.id,
      toBranchId: branch2.id,
      status: "PENDING",
      note: "Зайсангаас Имарт руу илүүдлээс шилжүүлэх",
      createdById: userId,
      items: {
        create: [
          { productId: products[0].id, quantity: 5 }
        ]
      }
    }
  })

  console.log("🎉 WMS Demo дата амжилттай орлоо!")
}

main()
  .catch((e) => {
    console.error("❌ Алдаа гарлаа:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
