import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || (!session.permissions.includes("view_dashboard") && !session.permissions.includes("view_all_reports"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filterShiftId = searchParams.get("shiftId") || "";
    const filterStartDate = searchParams.get("startDate") || "";
    const filterEndDate = searchParams.get("endDate") || "";

    // Boundaries for today in local time
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Month start boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Construct filters for queries
    const baseWhere: Prisma.TransactionWhereInput = {};
    if (filterShiftId) {
      baseWhere.auditLogs = {
        some: { shiftId: filterShiftId }
      };
    }
    if (filterStartDate || filterEndDate) {
      baseWhere.createdAt = {};
      if (filterStartDate) {
        baseWhere.createdAt.gte = new Date(filterStartDate + "T00:00:00.000Z");
      }
      if (filterEndDate) {
        baseWhere.createdAt.lte = new Date(filterEndDate + "T23:59:59.999Z");
      }
    }

    // 1. Fetch Today's Transactions
    const todayTransactions = await db.transaction.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        ...baseWhere,
      },
      include: {
        items: true,
      },
    });

    const totalToday = todayTransactions.length;
    const completedToday = todayTransactions.filter(t => t.status === "Selesai").length;
    const pendingToday = todayTransactions.filter(t => ["Menunggu Administrasi", "Administrasi Selesai", "Menunggu Penyerahan"].includes(t.status)).length;
    const cancelledToday = todayTransactions.filter(t => t.status === "Dibatalkan").length;

    // Grams / Items handed over today
    let totalItemsHandedOverToday = 0;
    let revenueToday = 0;
    todayTransactions.forEach((tx) => {
      if (tx.status === "Selesai") {
        tx.items.forEach((item) => {
          totalItemsHandedOverToday += item.qty;
          revenueToday += item.qty * item.price;
        });
      }
    });

    // 2. Monthly Revenue
    const monthTransactions = await db.transaction.findMany({
      where: {
        status: "Selesai",
        createdAt: {
          gte: monthStart,
        },
        ...baseWhere,
      },
      include: {
        items: true,
      },
    });

    let revenueMonth = 0;
    monthTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        revenueMonth += item.qty * item.price;
      });
    });

    // 3. Hourly Sales Trend for Today
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 07.00 to 18.00
    const salesTrend = hours.map((hour) => {
      const start = new Date(todayStart);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(todayStart);
      end.setHours(hour, 59, 59, 999);

      const hourTx = todayTransactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= start && tDate <= end;
      });

      let revenue = 0;
      hourTx.forEach((tx) => {
        if (tx.status === "Selesai") {
          tx.items.forEach((item) => {
            revenue += item.qty * item.price;
          });
        }
      });

      return {
        time: `${String(hour).padStart(2, "0")}:00`,
        transactions: hourTx.length,
        revenue: revenue,
      };
    });

    // 4. Top Products & Product Sales Summary (Rekap Produk)
    const allProducts = await db.product.findMany();
    const productStats = await db.transactionItem.findMany({
      where: {
        transaction: {
          status: "Selesai",
          ...baseWhere,
        },
      },
      include: {
        product: true,
      },
    });

    const productSummaryMap: Record<string, { name: string; qty: number; weight: number; revenue: number }> = {};
    allProducts.forEach((p) => {
      productSummaryMap[p.id] = { name: p.name, qty: 0, weight: p.weight, revenue: 0 };
    });

    productStats.forEach((item) => {
      if (productSummaryMap[item.productId]) {
        productSummaryMap[item.productId].qty += item.qty;
        productSummaryMap[item.productId].revenue += item.qty * item.price;
      }
    });

    const rekapProduk = Object.values(productSummaryMap)
      .map(p => ({
        ...p,
        totalWeight: p.qty * p.weight
      }))
      .filter(p => p.qty > 0)
      .sort((a, b) => b.qty - a.qty);

    // 5. Shift Performance Summary (Rekap Shift)
    const allShifts = await db.shift.findMany();
    const shiftSummaryMap: Record<string, { id: string; name: string; transactions: number; revenue: number }> = {};
    allShifts.forEach((s) => {
      shiftSummaryMap[s.id] = { id: s.id, name: s.name, transactions: 0, revenue: 0 };
    });

    // To attribute transactions to shifts, we check the session/audit log that created or finalized the transaction
    const completedTransactions = await db.transaction.findMany({
      where: {
        ...baseWhere,
      },
      include: {
        items: true,
        auditLogs: true,
      },
    });

    completedTransactions.forEach((tx) => {
      // Find the shift from the first log (CREATE_TRANSACTION) or confirm log
      const firstLog = tx.auditLogs[0];
      const shiftId = firstLog?.shiftId;
      if (shiftId && shiftSummaryMap[shiftId]) {
        shiftSummaryMap[shiftId].transactions += 1;
        if (tx.status === "Selesai") {
          tx.items.forEach((item) => {
            shiftSummaryMap[shiftId].revenue += item.qty * item.price;
          });
        }
      } else {
        // Fallback: attribute by creation time
        const hour = new Date(tx.createdAt).getHours();
        // Shift Pagi (07.00 - 12.00), Shift Siang (12.00 - 17.00)
        let sName = hour < 12 ? "Shift Pagi" : "Shift Siang";
        const foundShift = allShifts.find(s => s.name === sName);
        if (foundShift && shiftSummaryMap[foundShift.id]) {
          shiftSummaryMap[foundShift.id].transactions += 1;
          if (tx.status === "Selesai") {
            tx.items.forEach((item) => {
              shiftSummaryMap[foundShift.id].revenue += item.qty * item.price;
            });
          }
        }
      }
    });

    const rekapShift = Object.values(shiftSummaryMap);

    // 6. Officer Summary (Rekap Petugas)
    const allUsers = await db.user.findMany({
      include: { role: true }
    });
    const logs = await db.auditLog.findMany({
      where: {
        userId: { not: null }
      }
    });

    const officerSummaryMap: Record<string, { name: string; username: string; role: string; verifications: number; handovers: number }> = {};
    allUsers.forEach((u) => {
      if (u.username !== "superadmin") {
        officerSummaryMap[u.id] = {
          name: u.name,
          username: u.username,
          role: u.role.name,
          verifications: 0,
          handovers: 0,
        };
      }
    });

    logs.forEach((log) => {
      if (log.userId && officerSummaryMap[log.userId]) {
        if (log.action === "VERIFY_ADMIN") {
          officerSummaryMap[log.userId].verifications += 1;
        } else if (log.action === "CONFIRM_HANDOVER") {
          officerSummaryMap[log.userId].handovers += 1;
        }
      }
    });

    const rekapPetugas = Object.values(officerSummaryMap).filter(o => o.verifications > 0 || o.handovers > 0);

    // 7. Payment Methods Summary (Rekap Pendapatan)
    const allPaymentMethods = await db.paymentMethod.findMany();
    const paymentSummaryMap: Record<string, { name: string; transactions: number; revenue: number }> = {};
    allPaymentMethods.forEach((pm) => {
      paymentSummaryMap[pm.id] = { name: pm.name, transactions: 0, revenue: 0 };
    });

    const salesByPayment = await db.transaction.findMany({
      where: {
        status: "Selesai",
        ...baseWhere,
      },
      include: {
        items: true,
      },
    });

    salesByPayment.forEach((tx) => {
      if (paymentSummaryMap[tx.paymentMethodId]) {
        paymentSummaryMap[tx.paymentMethodId].transactions += 1;
        tx.items.forEach((item) => {
          paymentSummaryMap[tx.paymentMethodId].revenue += item.qty * item.price;
        });
      }
    });

    const rekapPendapatan = Object.values(paymentSummaryMap).filter(p => p.transactions > 0);

    return NextResponse.json({
      totals: {
        totalToday,
        completedToday,
        pendingToday,
        cancelledToday,
        totalItemsHandedOverToday,
        revenueToday,
        revenueMonth,
      },
      salesTrend,
      rekapProduk,
      rekapShift,
      rekapPetugas,
      rekapPendapatan,
    });
  } catch (error: unknown) {
    console.error("GET reports error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
