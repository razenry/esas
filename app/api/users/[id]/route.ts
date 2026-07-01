import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_users"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, username, password, roleId } = body;

    if (!name || !username || !roleId) {
      return NextResponse.json({ error: "Nama, username, dan role wajib diisi" }, { status: 400 });
    }

    // Check unique username for other users
    const existing = await db.user.findFirst({
      where: {
        username,
        id: { not: id },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Username sudah digunakan oleh user lain" }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      name,
      username,
      roleId,
    };

    if (password && password.trim() !== "") {
      updateData.passwordHash = hashPassword(password);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        roleId: true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "UPDATE_USER",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Mengupdate user "${name}" (username: "${username}")`,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("PUT user error:", error);
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
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_users"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Check if trying to delete oneself
    if (session.userId === id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun Anda sendiri yang sedang aktif" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    await db.user.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        action: "DELETE_USER",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Menghapus user "${user.name}" (username: "${user.username}")`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE user error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
