import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (!session.permissions.includes("configure_settings") && !session.permissions.includes("view_all_reports"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const logs = await db.auditLog.findMany({
      include: {
        user: {
          select: { name: true, username: true, role: { select: { name: true } } },
        },
        shift: true,
        transaction: {
          select: { transactionNumber: true, queueNumber: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    console.error("GET audit logs error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
