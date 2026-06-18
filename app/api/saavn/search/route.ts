import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const saavnUrl = `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=10`;

    // Node.js 18+ fetch is powered by undici under the hood
    const apiRes = await fetch(saavnUrl);

    if (!apiRes.ok) {
      throw new Error(`JioSaavn API responded with status: ${apiRes.status}`);
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to search JioSaavn";
    console.error("[JioSaavn API Proxy Error]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
