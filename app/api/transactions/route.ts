import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Validator for customer submission
const createTransactionSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    nik: z.string().length(16, "NIK harus 16 digit"),
    address: z.string().min(1, "Alamat wajib diisi"),
    phone: z.string().min(10, "Nomor HP minimal 10 digit"),
    email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
    notes: z.string().optional(),
  }),
  paymentMethodId: z.string().min(1, "Metode pembayaran harus dipilih"),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().min(1, "Qty minimal 1"),
    })
  ).min(1, "Minimal memilih satu produk"),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const shiftId = searchParams.get("shiftId") || "";
    const productId = searchParams.get("productId") || "";
    const paymentMethodId = searchParams.get("paymentMethodId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Construct Prisma where clause
    const where: Prisma.TransactionWhereInput = {};

    // Search query matches Nama, NIK, Phone, TX Number, Queue Number
    if (search) {
      where.OR = [
        { transactionNumber: { contains: search } },
        { queueNumber: { contains: search } },
        {
          customer: {
            OR: [
              { name: { contains: search } },
              { nik: { contains: search } },
              { phone: { contains: search } },
            ],
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (paymentMethodId) {
      where.paymentMethodId = paymentMethodId;
    }

    if (productId) {
      where.items = {
        some: {
          productId: productId,
        },
      };
    }

    // Filter by Shift (via session or audit logs of the transaction, or simply by matching time or auditLog)
    if (shiftId) {
      where.auditLogs = {
        some: {
          shiftId: shiftId,
        },
      };
    }

    // Filter by Date
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate + "T00:00:00.000Z");
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    const transactions = await db.transaction.findMany({
      where,
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
          orderBy: { timestamp: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (error: unknown) {
    console.error("GET transactions error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const result = createTransactionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customer: customerData, paymentMethodId, items } = result.data;

    // Verify payment method is active
    const pm = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
    if (!pm || !pm.isActive) {
      return NextResponse.json({ error: "Metode pembayaran tidak valid atau tidak aktif" }, { status: 400 });
    }

    // Verify products are active and resolve prices
    const resolvedItems: { productId: string; qty: number; price: number }[] = [];
    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || !product.isActive) {
        return NextResponse.json({ error: `Produk ${item.productId} tidak valid atau tidak aktif` }, { status: 400 });
      }
      resolvedItems.push({
        productId: product.id,
        qty: item.qty,
        price: product.price, // Snapshot current price
      });
    }

    // Generate Transaction & Queue Numbers
    // Start and end of today in local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await db.transaction.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Format YYYYMMDD
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const date = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${date}`;

    const sequenceStr = String(count + 1).padStart(4, "0");
    const transactionNumber = `TX-${dateStr}-${sequenceStr}`;
    
    // Fetch queue prefix setting from db
    const prefixSetting = await db.setting.findUnique({
      where: { key: "queue_prefix" }
    });
    const queuePrefix = prefixSetting?.value || "A";
    const queueNumber = `${queuePrefix}-${String(count + 1).padStart(3, "0")}`;

    // Execute in db transaction
    const newTransaction = await db.$transaction(async (tx) => {
      // 1. Create or Find Customer (match by NIK)
      let dbCustomer = await tx.customer.findFirst({
        where: { nik: customerData.nik },
      });

      if (dbCustomer) {
        // Update customer details if they changed
        dbCustomer = await tx.customer.update({
          where: { id: dbCustomer.id },
          data: {
            name: customerData.name,
            address: customerData.address,
            phone: customerData.phone,
            email: customerData.email || null,
            notes: customerData.notes || null,
          },
        });
      } else {
        dbCustomer = await tx.customer.create({
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

      // 2. Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          transactionNumber,
          queueNumber,
          status: "Menunggu Administrasi", // Initial workflow status
          customerId: dbCustomer.id,
          paymentMethodId,
        },
      });

      // 3. Create items
      for (const item of resolvedItems) {
        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            qty: item.qty,
            price: item.price,
          },
        });
      }

      // 4. Create initial Audit Log
      await tx.auditLog.create({
        data: {
          action: "CREATE_TRANSACTION",
          transactionId: transaction.id,
          details: `Transaksi dibuat oleh customer. Nomor: ${transactionNumber}, Antrian: ${queueNumber}. Menunggu verifikasi administrasi.`,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transactionId: newTransaction.id,
      transactionNumber: newTransaction.transactionNumber,
      queueNumber: newTransaction.queueNumber,
    });
  } catch (error: unknown) {
    console.error("POST transactions error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
