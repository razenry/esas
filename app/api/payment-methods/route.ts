import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const paymentMethods = await db.paymentMethod.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ paymentMethods });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("crud_payment_methods")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await db.paymentMethod.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ error: "Payment method already exists" }, { status: 400 });
    }

    const paymentMethod = await db.paymentMethod.create({
      data: {
        name,
        isActive: isActive ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE_PAYMENT_METHOD",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Created payment method "${name}"`,
      },
    });

    return NextResponse.json({ success: true, paymentMethod });
  } catch (error: unknown) {
    console.error("POST payment method error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("crud_payment_methods")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, isActive } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
    }

    const existing = await db.paymentMethod.findFirst({
      where: {
        name,
        id: { not: id }
      }
    });
    if (existing) {
      return NextResponse.json({ error: "Payment method already exists" }, { status: 400 });
    }

    const paymentMethod = await db.paymentMethod.update({
      where: { id },
      data: {
        name,
        isActive: isActive ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "UPDATE_PAYMENT_METHOD",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Updated payment method "${name}", active: ${isActive}`,
      },
    });

    return NextResponse.json({ success: true, paymentMethod });
  } catch (error: unknown) {
    console.error("PUT payment method error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
