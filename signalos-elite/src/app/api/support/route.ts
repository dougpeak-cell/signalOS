import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body.message || "").trim();
    const page = String(body.page || "");
    const email = String(body.email || "No user email provided");

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Support email is not configured." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: "SigiOS Support <support@sigios.com>",
      to: "support@sigios.com",
      subject: "New SigiOS Support Message",
      text: `
New SigiOS support message

From:
${email}

Page:
${page}

Message:
${message}
      `.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Support email error:", error);

    return NextResponse.json(
      { error: "Unable to send support message." },
      { status: 500 }
    );
  }
}