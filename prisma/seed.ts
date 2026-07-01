import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding started...");

  // 1. Seed Roles
  const rolesData = [
    {
      name: "Super Admin",
      permissions: JSON.stringify([
        "crud_users",
        "crud_roles",
        "crud_shifts",
        "crud_products",
        "crud_payment_methods",
        "view_all_transactions",
        "edit_transactions",
        "change_transaction_status",
        "view_all_reports",
        "export_data",
        "configure_settings",
      ]),
    },
    {
      name: "Admin Booth",
      permissions: JSON.stringify([
        "view_all_transactions",
        "edit_transactions",
        "scan_qr",
        "verify_admin",
        "change_transaction_status",
        "view_dashboard",
        "view_reports",
      ]),
    },
    {
      name: "Petugas Administrasi",
      permissions: JSON.stringify([
        "login",
        "select_shift",
        "scan_qr",
        "view_customer_data",
        "verify_data",
        "change_transaction_status_admin", // to "Administrasi Selesai"
      ]),
    },
    {
      name: "Petugas Penyerahan",
      permissions: JSON.stringify([
        "login",
        "select_shift",
        "scan_qr",
        "verify_customer_identity",
        "confirm_handover",
        "change_transaction_status_handover", // to "Barang Diserahkan"
      ]),
    },
  ];

  const roles: Record<string, any> = {};
  for (const role of rolesData) {
    roles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
  }
  console.log("Roles seeded.");

  // 2. Seed Shifts
  const shiftsData = [
    { name: "Shift Pagi", startTime: "07:00", endTime: "12:00", isActive: true },
    { name: "Shift Siang", startTime: "12:00", endTime: "17:00", isActive: true },
  ];

  const shifts: Record<string, any> = {};
  for (const shift of shiftsData) {
    shifts[shift.name] = await prisma.shift.upsert({
      where: { name: shift.name },
      update: { startTime: shift.startTime, endTime: shift.endTime, isActive: shift.isActive },
      create: shift,
    });
  }
  console.log("Shifts seeded.");

  // 3. Seed Products
  const productsData = [
    { name: "Sima 0.5 gram", weight: 0.5, price: 785000, isActive: true },
    { name: "Sima 1 gram", weight: 1.0, price: 1450000, isActive: true },
    { name: "Sima 2 gram", weight: 2.0, price: 2840000, isActive: true },
    { name: "Sima 5 gram", weight: 5.0, price: 6975000, isActive: true },
    { name: "Sima 10 gram", weight: 10.0, price: 13895000, isActive: true },
    { name: "Sima 25 gram", weight: 25.0, price: 34612000, isActive: true },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { price: p.price, weight: p.weight, isActive: p.isActive },
      create: p,
    });
  }
  console.log("Products seeded.");

  // 4. Seed Payment Methods
  const paymentMethodsData = [
    { name: "Cash", isActive: true },
    { name: "QRIS", isActive: true },
    { name: "Transfer BCA", isActive: true },
    { name: "Transfer Mandiri", isActive: true },
    { name: "Debit Card", isActive: true },
    { name: "Credit Card", isActive: true },
  ];

  for (const pm of paymentMethodsData) {
    await prisma.paymentMethod.upsert({
      where: { name: pm.name },
      update: { isActive: pm.isActive },
      create: pm,
    });
  }
  console.log("Payment methods seeded.");

  // 5. Seed Users
  const usersData = [
    {
      name: "Super Admin SBAS",
      username: "superadmin",
      passwordHash: hashPassword("superadmin"),
      roleId: roles["Super Admin"].id,
    },
    {
      name: "Admin Booth Event",
      username: "adminbooth",
      passwordHash: hashPassword("adminbooth"),
      roleId: roles["Admin Booth"].id,
    },
    {
      name: "Petugas Administrasi 1",
      username: "petugasadmin",
      passwordHash: hashPassword("petugasadmin"),
      roleId: roles["Petugas Administrasi"].id,
    },
    {
      name: "Petugas Penyerahan 1",
      username: "petugaspenyerahan",
      passwordHash: hashPassword("petugaspenyerahan"),
      roleId: roles["Petugas Penyerahan"].id,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: u.passwordHash, roleId: u.roleId, name: u.name },
      create: u,
    });
  }
  console.log("Users seeded.");

  // 6. Seed Settings
  const settingsData = [
    { key: "booth_name", value: "Sima Gold Exhibition Booth" },
    { key: "event_location", value: "Grand Indonesia Mall, Jakarta" },
    { key: "admin_docs_google_url", value: "https://docs.google.com/spreadsheets/d/mock-sheet-id" },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("Settings seeded.");

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
