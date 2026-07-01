import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await db.setting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    return NextResponse.json({ settings: settingsMap });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("configure_settings")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { booth_name, event_location, admin_docs_google_url, queue_prefix } = body;

    const updates = [
      { key: "booth_name", value: booth_name ?? "Sima Gold Exhibition Booth" },
      { key: "event_location", value: event_location ?? "Grand Indonesia Mall, Jakarta" },
      { key: "admin_docs_google_url", value: admin_docs_google_url ?? "" },
      { key: "queue_prefix", value: queue_prefix ?? "A" },
    ];

    for (const update of updates) {
      await db.setting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    await db.auditLog.create({
      data: {
        action: "UPDATE_SETTINGS",
        userId: session.userId,
        shiftId: session.shiftId,
        details: `Updated general settings: Booth Name: ${booth_name}, Location: ${event_location}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST settings error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
