import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const products = await db.product.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("crud_products")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, weight, price, isActive } = body;

    if (!name || weight === undefined || price === undefined) {
      return NextResponse.json({ error: "Name, weight, and price are required" }, { status: 400 });
    }

    // Check if name unique
    const existing = await db.product.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ error: "Product name already exists" }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        name,
        weight: parseFloat(weight),
        price: parseFloat(price),
        isActive: isActive ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE_PRODUCT",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Created product "${name}" (${weight}g) at price IDR ${price}`,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    console.error("POST product error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("crud_products")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, weight, price, isActive } = body;

    if (!id || !name || weight === undefined || price === undefined) {
      return NextResponse.json({ error: "ID, name, weight, and price are required" }, { status: 400 });
    }

    // Check if name unique and not matching this ID
    const existing = await db.product.findFirst({
      where: {
        name,
        id: { not: id }
      }
    });
    if (existing) {
      return NextResponse.json({ error: "Product name already exists" }, { status: 400 });
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        weight: parseFloat(weight),
        price: parseFloat(price),
        isActive: isActive ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "UPDATE_PRODUCT",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Updated product "${name}" (${weight}g) to price IDR ${price}, active: ${isActive}`,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    console.error("PUT product error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
