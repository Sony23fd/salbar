import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext, canViewBranch } from "@/lib/wms-auth";

export async function GET(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const counts = await db.stockCount.findMany({
      where: user.role !== "ADMIN" && !user.canViewOtherBranches ? { branchId: user.branchId! } : undefined,
      include: {
        branch: true,
        createdBy: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { branchId, note, items } = body;

    if (!canViewBranch(user, branchId)) {
      return NextResponse.json({ error: "Энэ салбарт тооллого хийх эрхгүй байна." }, { status: 403 });
    }

    const result = await db.$transaction(async (tx) => {
      const stockCount = await tx.stockCount.create({
        data: {
          branchId,
          note,
          status: "COMPLETED",
          createdById: user.id,
          approvedById: user.id,
        }
      });

      for (const item of items) {
        // Find current inventory
        const inv = await tx.inventory.findFirst({
          where: { branchId, productId: item.productId, variantId: item.variantId || null, binId: item.binId || null }
        });

        const systemQty = inv ? inv.quantity : 0;
        const countedQty = parseInt(item.countedQty) || 0;
        const difference = countedQty - systemQty;

        // Create count item record
        await tx.stockCountItem.create({
          data: {
            stockCountId: stockCount.id,
            productId: item.productId,
            variantId: item.variantId || null,
            binId: item.binId || null,
            systemQty,
            countedQty,
            difference
          }
        });

        // Create adjustment if difference exists
        if (difference !== 0) {
          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: countedQty }
            });
          } else {
            await tx.inventory.create({
              data: {
                branchId,
                productId: item.productId,
                variantId: item.variantId || null,
                binId: item.binId || null,
                quantity: countedQty
              }
            });
          }

          await tx.stockMovement.create({
            data: {
              branchId,
              productId: item.productId,
              variantId: item.variantId || null,
              binId: item.binId || null,
              type: "ADJUSTMENT",
              quantity: difference,
              note: `Тооллогын тохируулга (Баримт: ${stockCount.id})`
            }
          });
        }
      }

      // Log action
      await tx.activityLog.create({
        data: {
          userId: user.id,
          userName: user.name || "Unknown",
          userRole: user.role,
          action: "STOCK_COUNT_COMPLETED",
          target: stockCount.id,
          detail: `Салбарт тооллого хийж ${items.length} барааны үлдэгдлийг тохируулав.`
        }
      });

      return stockCount;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to submit stock count" }, { status: 500 });
  }
}
