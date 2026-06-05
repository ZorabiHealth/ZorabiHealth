import { NextRequest, NextResponse } from "next/server";
import { Vonage } from "@vonage/server-sdk";

// POST /api/vonage/send
// Body: { to: string, text: string }
// Sends an SMS via Vonage using the official @vonage/server-sdk

export async function POST(req: NextRequest) {
  const { to, text } = await req.json();

  if (!to || !text) {
    return NextResponse.json({ error: "Missing required fields: to, text" }, { status: 400 });
  }

  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const fromNumber = process.env.VONAGE_FROM_NUMBER || "ZorabiHealth";

  if (!apiKey || !apiSecret) {
    console.warn("Vonage credentials not configured — SMS not sent");
    return NextResponse.json(
      {
        success: false,
        simulated: true,
        message: `[SIMULATED] SMS to ${to}: ${text}`,
        note: "Add VONAGE_API_KEY and VONAGE_API_SECRET to .env.local to send real SMS",
      },
      { status: 200 }
    );
  }

  try {
    const vonage = new Vonage({
      apiKey,
      apiSecret,
    });

    // Using the official Vonage SDK v3 SMS API
    const response = await vonage.sms.send({
      to,
      from: fromNumber,
      text,
    });

    const messageStatus = response.messages[0];

    if (messageStatus.status === "0") {
      return NextResponse.json({
        success: true,
        messageId: messageStatus["message-id"],
        to: messageStatus.to,
        remainingBalance: messageStatus["remaining-balance"],
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          errorText: messageStatus.errorText,
          status: messageStatus.status,
        },
        { status: 422 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Vonage SMS error:", message);
    return NextResponse.json({ error: "Failed to send SMS", details: message }, { status: 500 });
  }
}
