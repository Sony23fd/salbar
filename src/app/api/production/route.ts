import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext } from "@/lib/wms-auth";

export async function GET(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const batches = await db.productionBatch.findMany({
      include: { product: true, variant: true, recordedBy: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(batches);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch production batches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { productId, variantId, quantity, cost, manufacturedDate, expiryDate } = body;

    // For manufacturing, we increment stock in the user's branch (usually a MAIN_WAREHOUSE).
    if (!user.branchId) {
      return NextResponse.json({ error: "Та аль нэг салбарт харьяалагдаагүй байна." }, { status: 400 });
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const batchNumber = `MFG-${date}-${random}`;

    const result = await db.$transaction(async (tx) => {
      const batch = await tx.productionBatch.create({
        data: {
          batchNumber,
          productId,
          variantId: variantId || null,
          quantity: parseInt(quantity),
          cost: cost ? parseFloat(cost) : null,
          manufacturedDate: manufacturedDate ? new Date(manufacturedDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          status: "COMPLETED", // Immediate completion for MVP
          recordedById: user.id
        }
      });

      let inv = await tx.inventory.findFirst({
        where: { branchId: user.branchId!, productId, variantId: variantId || null }
      });

      if (inv) {
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { increment: parseInt(quantity) } }
        });
      } else {
        await tx.inventory.create({
          data: {
            branchId: user.branchId!,
            productId,
            variantId: variantId || null,
            quantity: parseInt(quantity)
          }
        });
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          userName: user.name || "Unknown",
          userRole: user.role,
          action: "PRODUCTION_COMPLETED",
          target: batchNumber,
          detail: `${quantity} ш бараа үйлдвэрлэлээс орлогодов.`
        }
      });

      return batch;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to record production" }, { status: 500 });
  }
}
