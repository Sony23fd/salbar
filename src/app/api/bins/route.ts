import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext, canViewBranch } from "@/lib/wms-auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    if (!branchId) return NextResponse.json({ error: "branchId шаардлагатай" }, { status: 400 });

    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user || !canViewBranch(user, branchId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bins = await db.binLocation.findMany({
      where: { branchId },
      orderBy: [{ aisle: "asc" }, { rack: "asc" }, { shelf: "asc" }, { name: "asc" }]
    });

    return NextResponse.json(bins);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bins" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { branchId, name, aisle, rack, shelf } = body;

    if (!canViewBranch(user, branchId)) {
      return NextResponse.json({ error: "Энэ салбарт байршил үүсгэх эрхгүй байна." }, { status: 403 });
    }

    const bin = await db.binLocation.create({
      data: {
        branchId,
        name,
        aisle: aisle || null,
        rack: rack || null,
        shelf: shelf || null,
      }
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        userName: user.name || "Unknown",
        userRole: user.role,
        action: "BIN_CREATED",
        target: bin.id,
        detail: `Шинэ байршил үүсгэлээ: ${name}`
      }
    });

    return NextResponse.json(bin);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create bin" }, { status: 500 });
  }
}
