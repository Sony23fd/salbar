import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWmsUserContext } from "@/lib/wms-auth";

export async function GET(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clients = await db.b2BClient.findMany({
      include: { priceTier: true, orders: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { authorized, user } = await getWmsUserContext();
    if (!authorized || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { companyName, registryNumber, contactPerson, phoneNumber, email, address, creditLimit } = body;

    const client = await db.b2BClient.create({
      data: {
        companyName,
        registryNumber: registryNumber || null,
        contactPerson: contactPerson || null,
        phoneNumber: phoneNumber || null,
        email: email || null,
        address: address || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0
      }
    });

    return NextResponse.json(client);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to create client" }, { status: 500 });
  }
}
