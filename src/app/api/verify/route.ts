import { NextRequest, NextResponse } from "next/server";
import { parseEnvelope, verifyEnvelope } from "@/lib/signatures/envelope";

const records = new Map<string, ReturnType<typeof parseEnvelope>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { envelope?: string; recordId?: string };
    if (typeof body.envelope !== "string") {
      return NextResponse.json({ error: "envelope wajib berupa JSON string" }, { status: 400 });
    }
    const envelope = parseEnvelope(body.envelope);
    const recordId = body.recordId || crypto.randomUUID();
    records.set(recordId, envelope);
    return NextResponse.json({ recordId, envelope });
  } catch {
    return NextResponse.json({ error: "Envelope tidak valid" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const recordId = request.nextUrl.searchParams.get("recordId");
  if (!recordId) return NextResponse.json({ error: "recordId wajib diisi" }, { status: 400 });
  const envelope = records.get(recordId);
  if (!envelope) return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ recordId, envelope });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as { recordId?: string; documentBase64?: string };
    if (!body.recordId || typeof body.documentBase64 !== "string") {
      return NextResponse.json({ error: "recordId dan documentBase64 wajib diisi" }, { status: 400 });
    }
    const envelope = records.get(body.recordId);
    if (!envelope) return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });
    const bytes = Uint8Array.from(Buffer.from(body.documentBase64, "base64"));
    return NextResponse.json(await verifyEnvelope(envelope, bytes));
  } catch {
    return NextResponse.json({ error: "Permintaan verifikasi tidak valid" }, { status: 400 });
  }
}
