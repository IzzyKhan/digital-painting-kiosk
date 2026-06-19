import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const artwork = await prisma.artwork.findFirst({
      where: { id, published: true },
      select: { imageUrl: true },
    });

    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    const imageRes = await fetch(artwork.imageUrl, { cache: "no-store" });
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch artwork image" },
        { status: 502 }
      );
    }

    const imageBuffer = await imageRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": imageRes.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/artworks/[id]/image failed:", error);
    return NextResponse.json(
      { error: "Failed to load artwork image" },
      { status: 500 }
    );
  }
}
