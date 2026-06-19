import { NextResponse } from "next/server";
import { isBrushParams, sanitizeArtworkTitle } from "@/lib/brushParams";
import { prisma } from "@/lib/prisma";
import { uploadArtworkImage } from "@/lib/uploadArtworkImage";
import type { BrushParams } from "@/lib/brushParams";

type CreateArtworkBody = {
  imageBase64: string;
  params: BrushParams;
  title?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateArtworkBody;

    if (!body.imageBase64 || typeof body.imageBase64 !== "string") {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    if (!isBrushParams(body.params)) {
      return NextResponse.json(
        { error: "params must be a valid BrushParams object" },
        { status: 400 }
      );
    }

    const title = sanitizeArtworkTitle(body.title);

    const imageUrl = await uploadArtworkImage(body.imageBase64);

    const artwork = await prisma.artwork.create({
      data: {
        title,
        params: body.params,
        imageUrl,
      },
    });

    return NextResponse.json({
      id: artwork.id,
      imageUrl: artwork.imageUrl,
      title: artwork.title,
      createdAt: artwork.createdAt,
    });
  } catch (error) {
    console.error("POST /api/artworks failed:", error);
    const message =
      error instanceof Error && error.message === "Blob storage is not configured"
        ? "Blob storage is not configured"
        : "Failed to save artwork";
    const status =
      error instanceof Error && error.message === "Blob storage is not configured"
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") ?? 48);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 48;

    const artworks = await prisma.artwork.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ artworks });
  } catch (error) {
    console.error("GET /api/artworks failed:", error);
    return NextResponse.json(
      { error: "Failed to load artworks" },
      { status: 500 }
    );
  }
}