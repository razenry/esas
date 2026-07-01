import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, deleteSession, getSession, hashPassword } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  return NextResponse.json({ session });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { username, password, shiftId, switchRoleName, switchShiftId } = body;

    // Staging / Demo Role Switcher logic
    if (switchRoleName) {
      if (process.env.NEXT_PUBLIC_APP_ENV !== "staging") {
        return NextResponse.json({ error: "Bypass staging dinonaktifkan di mode ini" }, { status: 403 });
      }

      const role = await db.role.findUnique({
        where: { name: switchRoleName },
      });

      if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      // Find first user with this role
      let user = await db.user.findFirst({
        where: { roleId: role.id },
      });

      // If user doesn't exist, create a mock one
      if (!user) {
        const usernameMap: Record<string, string> = {
          "Super Admin": "superadmin",
          "Admin Booth": "adminbooth",
          "Petugas Administrasi": "petugasadmin",
          "Petugas Penyerahan": "petugaspenyerahan",
        };
        const mUsername = usernameMap[switchRoleName] || "mockuser";
        user = await db.user.create({
          data: {
            name: `${switchRoleName} Demo`,
            username: mUsername,
            passwordHash: hashPassword(mUsername),
            roleId: role.id,
          },
        });
      }

      // Find an active shift
      let selectedShiftId = switchShiftId;
      if (!selectedShiftId) {
        const firstShift = await db.shift.findFirst({ where: { isActive: true } });
        if (!firstShift) {
          return NextResponse.json({ error: "No active shifts in system. Please seed shifts." }, { status: 400 });
        }
        selectedShiftId = firstShift.id;
      }

      // Create session
      await createSession(user.id, selectedShiftId);

      // Create Audit Log
      await db.auditLog.create({
        data: {
          action: "SWITCH_ROLE_DEMO",
          userId: user.id,
          shiftId: selectedShiftId,
          details: `Role switched to ${switchRoleName} in demo mode (Shift: ${switchRoleName})`,
        },
      });

      const updatedSession = await getSession();
      return NextResponse.json({ success: true, session: updatedSession });
    }

    // Normal credentials login
    if (!username || !password || !shiftId) {
      return NextResponse.json({ error: "Username, password, and shift ID are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const hashedInput = hashPassword(password);
    if (user.passwordHash !== hashedInput) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Validate shift exists and is active
    const shift = await db.shift.findUnique({ where: { id: shiftId } });
    if (!shift || !shift.isActive) {
      return NextResponse.json({ error: "Selected shift is invalid or inactive" }, { status: 400 });
    }

    // Create session
    await createSession(user.id, shiftId);

    // Create Audit Log
    await db.auditLog.create({
      data: {
        action: "EMPLOYEE_LOGIN",
        userId: user.id,
        shiftId: shiftId,
        details: `${user.name} (${user.role.name}) logged in for shift ${shift.name}`,
      },
    });

    const updatedSession = await getSession();
    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error: unknown) {
    console.error("Auth session POST error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session) {
      await db.auditLog.create({
        data: {
          action: "EMPLOYEE_LOGOUT",
          userId: session.userId,
          shiftId: session.shiftId,
          details: `${session.userName} (${session.roleName}) logged out`,
        },
      });
    }
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Auth session DELETE error:", error);
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
