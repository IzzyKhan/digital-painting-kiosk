import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

type EmailArtworkBody = {
  email?: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Intentionally simple — server-side guard, not strict validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Digital Painting Kiosk <onboarding@resend.dev>";

export async function POST(request: Request, context: RouteContext) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email is not configured" },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = (await request.json()) as EmailArtworkBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const artwork = await prisma.artwork.findFirst({
      where: { id, published: true },
      select: { id: true, title: true, imageUrl: true },
    });

    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    const imageRes = await fetch(artwork.imageUrl, { cache: "no-store" });
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: "Could not load the artwork image" },
        { status: 502 }
      );
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    const displayTitle = artwork.title?.trim() || "Untitled";

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email],
      subject: `Your painting: ${displayTitle}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; line-height: 1.5;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">${displayTitle}</h1>
          <p style="margin: 0 0 16px; color: #555;">
            Here's the painting you made at the kiosk. The full-size PNG is attached.
          </p>
          <p style="margin: 0; font-size: 12px; color: #999;">Digital Painting Kiosk</p>
        </div>
      `,
      attachments: [
        {
          filename: `${displayTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`,
          content: imageBuffer,
        },
      ],
    });

    if (error) {
      console.error("Resend send failed:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/artworks/[id]/email failed:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
