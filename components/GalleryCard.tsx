"use client";

import Link from "next/link";
import { DeleteArtworkButton } from "@/components/DeleteArtworkButton";

export type GalleryArtwork = {
  id: string;
  title: string | null;
  imageUrl: string;
  dateLabel: string;
};

export function GalleryCard({ artwork }: { artwork: GalleryArtwork }) {
  return (
    <li className="overflow-hidden rounded-control border border-border-subtle bg-surface">
      <Link href={`/artwork/${artwork.id}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.imageUrl}
          alt={artwork.title ?? "Untitled artwork"}
          className="aspect-square w-full bg-canvas-sunken object-cover"
        />
      </Link>
      <div className="p-3">
        <p className="truncate font-medium">{artwork.title ?? "Untitled"}</p>
        <p className="mb-3 text-xs text-ink-muted">{artwork.dateLabel}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/?artwork=${artwork.id}`}
            className="inline-flex min-h-9 items-center justify-center rounded-control border border-border bg-control px-3 text-sm text-ink hover:bg-control-hover"
          >
            Keep painting
          </Link>
          <DeleteArtworkButton
            artworkId={artwork.id}
            artworkTitle={artwork.title}
            className="inline-flex min-h-9 items-center justify-center rounded-control border border-danger px-3 text-sm text-danger hover:bg-danger/10"
          />
        </div>
      </div>
    </li>
  );
}
