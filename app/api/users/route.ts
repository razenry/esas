import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_users"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (session.roleName !== "Super Admin" && !session.permissions.includes("crud_users"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, username, password, roleId } = body;

    if (!name || !username || !password || !roleId) {
      return NextResponse.json({ error: "Semua field (nama, username, password, role) wajib diisi" }, { status: 400 });
    }

    // Check unique username
    const existing = await db.user.findUnique({
      where: { username },
    });
    if (existing) {
      return NextResponse.json({ error: "Username sudah digunakan oleh user lain" }, { status: 400 });
    }

    // Hash password
    const passwordHash = hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        username,
        passwordHash,
        roleId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        roleId: true,
      },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE_USER",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Membuat user baru "${name}" dengan username "${username}"`,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error("POST user error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
