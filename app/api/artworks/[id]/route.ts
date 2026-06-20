import { NextResponse } from "next/server";
import { isBrushParams, sanitizeArtworkTitle } from "@/lib/brushParams";
import { prisma } from "@/lib/prisma";
import { uploadArtworkImage } from "@/lib/uploadArtworkImage";
import type { BrushParams } from "@/lib/brushParams";

type UpdateArtworkBody = {
  imageBase64: string;
  params: BrushParams;
  title?: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const artwork = await prisma.artwork.findFirst({
      where: { id, published: true },
    });

    if (!artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    return NextResponse.json(artwork);
  } catch (error) {
    console.error("GET /api/artworks/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to load artwork" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.artwork.findFirst({
      where: { id, published: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateArtworkBody;

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

    const artwork = await prisma.artwork.update({
      where: { id },
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
    console.error("PATCH /api/artworks/[id] failed:", error);
    const message =
      error instanceof Error && error.message === "Blob storage is not configured"
        ? "Blob storage is not configured"
        : "Failed to update artwork";
    const status =
      error instanceof Error && error.message === "Blob storage is not configured"
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.artwork.findFirst({
      where: { id, published: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    await prisma.artwork.update({
      where: { id },
      data: { published: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/artworks/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete artwork" },
      { status: 500 }
    );
  }
}
