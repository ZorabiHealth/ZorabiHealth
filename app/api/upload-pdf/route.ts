import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileName = formData.get("fileName") as string | null;
    const filePath = formData.get("filePath") as string | null;
    const prescriptionId = formData.get("prescriptionId") as string | null;

    if (!file || !filePath || !fileName || !prescriptionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin!.storage
      .from("prescription_pdfs")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Server-side PDF upload failed:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: signed } = await supabaseAdmin!.storage
      .from("prescription_pdfs")
      .createSignedUrl(filePath, 3600);

    const signedUrl = signed?.signedUrl || null;

    const { error: docErr } = await supabaseAdmin!.from("prescription_documents").insert({
      prescription_id: prescriptionId,
      storage_path: filePath,
      file_name: fileName,
      file_size: file.size,
    });

    if (docErr) {
      console.error("prescription_documents insert failed:", docErr);
      return NextResponse.json({ error: docErr.message, signedUrl }, { status: 200 });
    }

    return NextResponse.json({ signedUrl, filePath }, { status: 200 });
  } catch (err) {
    console.error("Upload PDF API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
