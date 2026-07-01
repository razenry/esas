import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeTransactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
        },
        status: {
          in: ["Waiting_Admin", "Waiting_Handover", "Admin_Done"],
        },
      },
      select: {
        id: true,
        queueNumber: true,
        status: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const maskName = (name: string) => {
      const parts = name.trim().split(" ");
      if (parts.length === 0) return "";
      if (parts.length === 1) {
        const first = parts[0];
        return first.length > 2 ? first.slice(0, 2) + "***" : first + "***";
      }
      return parts.map((p, idx) => {
        if (idx === 0) return p;
        return p.charAt(0) + "***";
      }).join(" ");
    };

    const formatted = activeTransactions.map(tx => ({
      id: tx.id,
      queueNumber: tx.queueNumber,
      status: tx.status,
      createdAt: tx.createdAt,
      customerName: tx.customer.name,
      maskedName: maskName(tx.customer.name),
    }));

    const waitingAdmin = formatted.filter(tx => tx.status === "Waiting_Admin");
    const waitingHandover = formatted.filter(tx => tx.status === "Waiting_Handover");
    const activeServing = formatted.filter(tx => tx.status === "Admin_Done");

    const completedTransactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
        },
        status: {
          in: ["Handover_Done", "Done"],
        },
      },
      select: {
        id: true,
        queueNumber: true,
        status: true,
        updatedAt: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    });

    const completed = completedTransactions.map(tx => ({
      id: tx.id,
      queueNumber: tx.queueNumber,
      status: tx.status,
      updatedAt: tx.updatedAt,
      customerName: tx.customer.name,
      maskedName: maskName(tx.customer.name),
    }));

    return NextResponse.json({
      success: true,
      waitingAdmin,
      waitingHandover,
      activeServing,
      completed,
    });
  } catch (e: any) {
    console.error("Queue API Error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
