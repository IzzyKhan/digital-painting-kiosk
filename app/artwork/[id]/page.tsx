import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailArtworkForm } from "@/components/EmailArtworkForm";
import { formatArtworkDate } from "@/lib/brushParams";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ArtworkPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArtworkPage({ params }: ArtworkPageProps) {
  const { id } = await params;

  const artwork = await prisma.artwork.findFirst({
    where: { id, published: true },
  });

  if (!artwork) {
    notFound();
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-canvas text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {artwork.title ?? "Untitled"}
          </h1>
          <p className="text-sm text-ink-muted">
            {formatArtworkDate(artwork.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/gallery"
            className="rounded-control border border-border px-4 py-2 text-sm hover:bg-control"
          >
            Gallery
          </Link>
          <Link
            href="/"
            className="rounded-control border border-border px-4 py-2 text-sm hover:bg-control"
          >
            Kiosk
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.imageUrl}
          alt={artwork.title ?? "Artwork"}
          className="max-h-[70vh] w-full rounded-control border border-border-subtle bg-canvas-sunken object-contain"
        />

        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href={`/?artwork=${artwork.id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-control border border-border bg-control px-4 text-sm hover:bg-control-hover"
          >
            Continue painting
          </Link>
        </div>

        <EmailArtworkForm artworkId={artwork.id} className="w-full max-w-sm" />
      </div>
    </div>
  );
}
