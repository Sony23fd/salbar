import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext } from "@/lib/wms-auth";

export async function GET(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only Admin can view all audit logs, Branch Manager can only view their own or their branch's logs
    // But ActivityLog doesn't have branchId directly. We will filter by userRole or something if needed.
    // For simplicity, let's allow managers to see logs (or restrict it to ADMIN only).
    if (user.role !== "ADMIN" && !user.canViewOtherBranches) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
