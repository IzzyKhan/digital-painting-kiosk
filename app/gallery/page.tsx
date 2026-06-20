import Link from "next/link";
import { GalleryCard } from "@/components/GalleryCard";
import { formatArtworkDate } from "@/lib/brushParams";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ArtworkListItem = {
  id: string;
  title: string | null;
  imageUrl: string;
  createdAt: Date;
};

export default async function GalleryPage() {
  const artworks: ArtworkListItem[] = await prisma.artwork.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 48,
    select: {
      id: true,
      title: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  return (
    <div className="h-screen overflow-y-auto bg-canvas text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4">
        <h1 className="text-2xl font-semibold">Gallery</h1>
        <Link
          href="/"
          className="rounded-control border border-border px-4 py-2 text-sm hover:bg-control"
        >
          New painting
        </Link>
      </header>

      {artworks.length === 0 ? (
        <p className="px-6 py-12 text-ink-muted">
          No artworks yet. Create one at the kiosk.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3 lg:grid-cols-4">
          {artworks.map((artwork) => (
            <GalleryCard
              key={artwork.id}
              artwork={{
                id: artwork.id,
                title: artwork.title,
                imageUrl: artwork.imageUrl,
                dateLabel: formatArtworkDate(artwork.createdAt),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
