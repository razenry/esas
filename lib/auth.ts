import { cookies } from "next/headers";
import { db } from "./db";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export interface AuthSession {
  userId: string;
  shiftId: string;
  roleName: string;
  userName: string;
  shiftName: string;
  permissions: string[];
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sbas_session")?.value;
    if (!sessionId) return null;

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            role: true,
          },
        },
        shift: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.session.delete({ where: { id: sessionId } }).catch(() => {});
      }
      return null;
    }

    return {
      userId: session.user.id,
      shiftId: session.shiftId,
      roleName: session.user.role.name,
      userName: session.user.name,
      shiftName: session.shift.name,
      permissions: JSON.parse(session.user.role.permissions),
    };
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function createSession(userId: string, shiftId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8); // 8 hours
  
  // Clean up any old sessions for this user to avoid dangling sessions
  await db.session.deleteMany({
    where: { userId }
  }).catch(() => {});

  const session = await db.session.create({
    data: {
      userId,
      shiftId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("sbas_session", session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  return session.id;
}

export async function deleteSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sbas_session")?.value;
    if (sessionId) {
      await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    }
    cookieStore.delete("sbas_session");
  } catch (error) {
    console.error("Error deleting session:", error);
  }
}
