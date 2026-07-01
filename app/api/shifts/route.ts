import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const shifts = await db.shift.findMany({
      orderBy: { startTime: "asc" },
    });
    return NextResponse.json({ shifts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("crud_shifts")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, startTime, endTime, isActive } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: "Name, start time, and end time are required" }, { status: 400 });
    }

    // Check unique name
    const existing = await db.shift.findUnique({
      where: { name }
    });
    if (existing) {
      return NextResponse.json({ error: "Shift name already exists" }, { status: 400 });
    }

    const shift = await db.shift.create({
      data: {
        name,
        startTime,
        endTime,
        isActive: isActive ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE_SHIFT",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Created shift "${name}" (${startTime} - ${endTime})`,
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: unknown) {
    console.error("POST shift error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("crud_shifts")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, startTime, endTime, isActive } = body;

    if (!id || !name || !startTime || !endTime) {
      return NextResponse.json({ error: "ID, name, start time, and end time are required" }, { status: 400 });
    }

    const existing = await db.shift.findFirst({
      where: {
        name,
        id: { not: id }
      }
    });
    if (existing) {
      return NextResponse.json({ error: "Shift name already exists" }, { status: 400 });
    }

    const shift = await db.shift.update({
      where: { id },
      data: {
        name,
        startTime,
        endTime,
        isActive: isActive ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "UPDATE_SHIFT",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Updated shift "${name}" (${startTime} - ${endTime}), active: ${isActive}`,
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: unknown) {
    console.error("PUT shift error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
