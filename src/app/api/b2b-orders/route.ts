import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext } from "@/lib/wms-auth";

export async function POST(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { clientId, items } = body;

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json({ error: "Харилцагч болон бараа сонгогдоогүй байна." }, { status: 400 });
    }

    const client = await db.b2BClient.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Харилцагч олдсонгүй." }, { status: 404 });

    const idempotencyKey = `B2B-${Date.now()}-${Math.random()}`;

    // Calculate totals
    let subtotal = 0;
    const orderItemsData = items.map((i: any) => {
      const q = parseInt(i.quantity);
      const price = parseFloat(i.customPrice || i.unitPrice);
      const total = q * price;
      subtotal += total;
      
      return {
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: q,
        unitPrice: parseFloat(i.unitPrice),
        customPrice: parseFloat(i.customPrice || i.unitPrice),
        totalPrice: total
      }
    });

    const paymentStatus = "PENDING";
    const orderStatus = "PENDING";

    const order = await db.order.create({
      data: {
        idempotencyKey,
        clientId,
        customerName: client.companyName,
        customerPhone: client.phoneNumber || "",
        customerEmail: client.email || "",
        subtotal,
        totalAmount: subtotal,
        orderStatus,
        paymentStatus,
        creationSource: "ADMIN",
        items: {
          create: orderItemsData
        }
      }
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        userName: user.name || "Unknown",
        userRole: user.role,
        action: "B2B_ORDER_CREATED",
        target: order.id,
        detail: `${client.companyName} харилцагчид ${subtotal}₮ дүнтэй захиалга үүсгэв.`
      }
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await db.order.findMany({
      where: { clientId: { not: null } },
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
