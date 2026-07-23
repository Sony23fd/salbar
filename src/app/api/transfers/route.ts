import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext, canViewBranch } from "@/lib/wms-auth";

export async function GET(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transfers = await db.stockTransfer.findMany({
      where: user.role !== "ADMIN" && !user.canViewOtherBranches ? {
        OR: [
          { fromBranchId: user.branchId! },
          { toBranchId: user.branchId! }
        ]
      } : undefined,
      include: {
        fromBranch: true,
        toBranch: true,
        createdBy: true,
        approvedBy: true,
        items: {
          include: {
            product: true,
            variant: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(transfers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fromBranchId, toBranchId, items, note, type } = body;

    if (!canViewBranch(user, fromBranchId)) {
      return NextResponse.json({ error: "Та энэ салбараас шилжүүлэг гаргах эрхгүй байна." }, { status: 403 });
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const referenceNumber = `TR-${date}-${random}`;

    const creatorId = user.id;

    const transfer = await db.stockTransfer.create({
      data: {
        referenceNumber,
        fromBranchId,
        toBranchId,
        createdById: creatorId,
        note,
        type: type || "REGULAR",
        status: "PENDING",
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: parseInt(item.quantity)
          }))
        }
      }
    });

    return NextResponse.json(transfer);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to create transfer" }, { status: 500 });
  }
}
