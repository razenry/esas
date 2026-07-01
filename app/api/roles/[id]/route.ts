import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_roles"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, permissions } = body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ error: "Nama role dan list permission wajib diisi" }, { status: 400 });
    }

    // Check unique name for other roles
    const existing = await db.role.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Nama role sudah digunakan oleh role lain" }, { status: 400 });
    }

    const role = await db.role.update({
      where: { id },
      data: {
        name,
        permissions: JSON.stringify(permissions),
      },
    });

    await db.auditLog.create({
      data: {
        action: "UPDATE_ROLE",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Mengupdate role "${name}"`,
      },
    });

    return NextResponse.json({ success: true, role });
  } catch (error: unknown) {
    console.error("PUT role error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_roles"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Check if role is used by users
    const userCount = await db.user.count({
      where: { roleId: id },
    });
    if (userCount > 0) {
      return NextResponse.json({ error: "Role tidak dapat dihapus karena sedang digunakan oleh beberapa user" }, { status: 400 });
    }

    const role = await db.role.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });
    }

    // Prevent deleting the Super Admin role itself
    if (role.name === "Super Admin") {
      return NextResponse.json({ error: "Tidak dapat menghapus role utama Super Admin" }, { status: 400 });
    }

    await db.role.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        action: "DELETE_ROLE",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Menghapus role "${role.name}"`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE role error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
