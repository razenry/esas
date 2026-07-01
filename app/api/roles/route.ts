import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_roles"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const roles = await db.role.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ roles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_roles"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, permissions } = body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "Nama role dan list permission wajib diisi" }, { status: 400 });
    }

    // Check unique name
    const existing = await db.role.findUnique({
      where: { name },
    });
    if (existing) {
      return NextResponse.json({ error: "Nama role sudah digunakan" }, { status: 400 });
    }

    const role = await db.role.create({
      data: {
        name,
        permissions: JSON.stringify(permissions),
      },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE_ROLE",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Membuat role baru "${name}"`,
      },
    });

    return NextResponse.json({ success: true, role });
  } catch (error: unknown) {
    console.error("POST role error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
