import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext } from "@/lib/wms-auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    if (!user.branchId) {
       return NextResponse.json({ error: "Та аль нэг салбарт харьяалагдаагүй байна." }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, client: true }
      });

      if (!order || order.orderStatus === "DELIVERED" || order.orderStatus === "CANCELLED") {
        throw new Error("Invalid order or already delivered/cancelled");
      }

      // Deduct inventory
      for (const item of order.items) {
        const inv = await tx.inventory.findFirst({
          where: { branchId: user.branchId!, productId: item.productId }
        });

        if (!inv || inv.quantity < item.quantity) {
          throw new Error(`Үлдэгдэл хүрэлцэхгүй байна: ${item.productName}`);
        }

        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantity: { decrement: item.quantity } }
        });

        await tx.stockMovement.create({
           data: {
             branchId: user.branchId!,
             productId: item.productId,
             type: "OUT",
             quantity: item.quantity,
             orderId: order.id,
             note: "B2B Хүргэлт"
           }
        });
      }

      // Update Order Status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: "DELIVERED",
          deliveryDate: new Date()
        }
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          userName: user.name || "Unknown",
          userRole: user.role,
          action: "B2B_ORDER_DELIVERED",
          target: order.id,
          detail: `Захиалга хүргэгдэж агуулахаас үлдэгдэл хасагдлаа.`
        }
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
