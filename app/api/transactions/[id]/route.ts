import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Search by UUID or Transaction Number
    const transaction = await db.transaction.findFirst({
      where: {
        OR: [{ id: id }, { transactionNumber: id }],
      },
      include: {
        customer: true,
        paymentMethod: true,
        items: {
          include: {
            product: true,
          },
        },
        auditLogs: {
          include: {
            user: {
              select: { name: true, username: true },
            },
            shift: true,
          },
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error: unknown) {
    console.error("GET transaction error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, status, paymentMethodId, customerData, items } = body;

    // Find the transaction
    const transaction = await db.transaction.findFirst({
      where: {
        OR: [{ id: id }, { transactionNumber: id }],
      },
      include: {
        customer: true,
        paymentMethod: true,
        items: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // 1. Action: VERIFY_ADMIN (Petugas Administrasi / Admin / Super Admin)
    if (action === "VERIFY_ADMIN") {
      if (
        !session.permissions.includes("change_transaction_status_admin") &&
        !session.permissions.includes("verify_admin") &&
        !session.permissions.includes("change_transaction_status")
      ) {
        return NextResponse.json({ error: "Anda tidak memiliki hak akses verifikasi administrasi" }, { status: 403 });
      }

      if (transaction.status !== "Menunggu Administrasi" && transaction.status !== "Waiting_Admin") {
        return NextResponse.json(
          { error: `Status transaksi saat ini: ${transaction.status}. Tidak dapat melakukan verifikasi.` },
          { status: 400 }
        );
      }

      // Transition Menunggu Administrasi -> Administrasi Selesai -> Menunggu Penyerahan
      const updated = await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "Menunggu Penyerahan", // Move to Menunggu Penyerahan directly so it is ready for handover
        },
      });

      // Write Audit Log
      await db.auditLog.create({
        data: {
          action: "VERIFY_ADMIN",
          transactionId: transaction.id,
          userId: session.userId,
          shiftId: session.shiftId,
          details: `Administrasi diverifikasi oleh ${session.userName} (${session.shiftName}). Status diubah menjadi "Administrasi Selesai" & "Menunggu Penyerahan".`,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    // 2. Action: CONFIRM_HANDOVER (Petugas Penyerahan / Admin / Super Admin)
    if (action === "CONFIRM_HANDOVER") {
      if (
        !session.permissions.includes("confirm_handover") &&
        !session.permissions.includes("change_transaction_status_handover") &&
        !session.permissions.includes("change_transaction_status")
      ) {
        return NextResponse.json({ error: "Anda tidak memiliki hak akses konfirmasi penyerahan" }, { status: 403 });
      }

      // Anti-Double Scan Check
      if (transaction.status === "Barang Diserahkan" || transaction.status === "Selesai") {
        // Find the handover audit log
        const handoverLog = await db.auditLog.findFirst({
          where: {
            transactionId: transaction.id,
            action: "CONFIRM_HANDOVER",
          },
          include: {
            user: { select: { name: true } },
            shift: true,
          },
          orderBy: { timestamp: "desc" },
        });

        return NextResponse.json(
          {
            error: "DOUBLE_SCAN",
            message: "Barang sudah pernah diserahkan",
            handoverDetails: {
              officerName: handoverLog?.user?.name || "Petugas Penyerahan",
              timestamp: handoverLog?.timestamp || transaction.updatedAt,
              shiftName: handoverLog?.shift?.name || "Shift Terkait",
            },
          },
          { status: 409 }
        );
      }

      if (transaction.status !== "Menunggu Penyerahan" && transaction.status !== "Administrasi Selesai") {
        return NextResponse.json(
          { error: `Status transaksi saat ini: ${transaction.status}. Silakan lakukan verifikasi administrasi terlebih dahulu.` },
          { status: 400 }
        );
      }

      // Transition to Barang Diserahkan -> Selesai
      const updated = await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "Selesai", // Transition to Selesai
        },
      });

      // Write Audit Log
      await db.auditLog.create({
        data: {
          action: "CONFIRM_HANDOVER",
          transactionId: transaction.id,
          userId: session.userId,
          shiftId: session.shiftId,
          details: `Emas diserahkan kepada customer oleh ${session.userName} (${session.shiftName}). Status diubah menjadi "Barang Diserahkan" & "Selesai".`,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    // 3. Action: EDIT_TRANSACTION (Super Admin / Admin Booth)
    if (action === "EDIT_TRANSACTION") {
      if (!session.permissions.includes("edit_transactions")) {
        return NextResponse.json({ error: "Anda tidak memiliki hak akses mengubah transaksi" }, { status: 403 });
      }

      const updated = await db.$transaction(async (tx) => {
        // Update customer details if provided
        if (customerData) {
          await tx.customer.update({
            where: { id: transaction.customerId },
            data: {
              name: customerData.name,
              nik: customerData.nik,
              address: customerData.address,
              phone: customerData.phone,
              email: customerData.email || null,
              notes: customerData.notes || null,
            },
          });
        }

        // Update payment method and items
        const updateData: { paymentMethodId?: string; status?: string } = {};
        if (paymentMethodId) {
          updateData.paymentMethodId = paymentMethodId;
        }
        if (status) {
          updateData.status = status;
        }

        const txUpdated = await tx.transaction.update({
          where: { id: transaction.id },
          data: updateData,
        });

        // Update items if provided
        if (items) {
          // Delete old items
          await tx.transactionItem.deleteMany({
            where: { transactionId: transaction.id },
          });

          // Insert new items
          for (const item of items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (product) {
              await tx.transactionItem.create({
                data: {
                  transactionId: transaction.id,
                  productId: item.productId,
                  qty: item.qty,
                  price: product.price,
                },
              });
            }
          }
        }

        return txUpdated;
      });

      await db.auditLog.create({
        data: {
          action: "EDIT_TRANSACTION",
          transactionId: transaction.id,
          userId: session.userId,
          shiftId: session.shiftId,
          details: `Detail transaksi diubah oleh ${session.userName} (${session.shiftName}).`,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    // 4. Action: UPDATE_STATUS (General status change - e.g. Cancel)
    if (status) {
      if (!session.permissions.includes("change_transaction_status")) {
        return NextResponse.json({ error: "Anda tidak memiliki hak akses mengubah status transaksi" }, { status: 403 });
      }

      const updated = await db.transaction.update({
        where: { id: transaction.id },
        data: { status },
      });

      await db.auditLog.create({
        data: {
          action: `STATUS_CHANGE_TO_${status.toUpperCase()}`,
          transactionId: transaction.id,
          userId: session.userId,
          shiftId: session.shiftId,
          details: `Status transaksi diubah menjadi "${status}" oleh ${session.userName} (${session.shiftName}).`,
        },
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("PUT transaction error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
