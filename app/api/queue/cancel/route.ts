import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { transactionId } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: "ID Transaksi wajib diisi" }, { status: 400 });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (transaction.status === "Selesai" || transaction.status === "Barang Diserahkan") {
      return NextResponse.json({ error: "Transaksi yang sudah selesai tidak dapat dibatalkan" }, { status: 400 });
    }

    const updated = await db.transaction.update({
      where: { id: transactionId },
      data: {
        status: "Dibatalkan",
      },
    });

    await db.auditLog.create({
      data: {
        action: "CUSTOMER_CANCEL",
        details: `Customer cancelled queue number ${transaction.queueNumber} voluntarily.`,
        transactionId: transactionId,
      },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (e: any) {
    console.error("Queue Cancel Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
