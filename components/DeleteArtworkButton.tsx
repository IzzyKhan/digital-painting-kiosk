"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type DeleteArtworkButtonProps = {
  artworkId: string;
  artworkTitle?: string | null;
  className?: string;
};

export function DeleteArtworkButton({
  artworkId,
  artworkTitle,
  className,
}: DeleteArtworkButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const displayTitle = artworkTitle?.trim() || "Untitled";

  const handleConfirmDelete = async () => {
    if (status === "working") return;

    setConfirmOpen(false);
    setStatus("working");

    try {
      const res = await fetch(`/api/artworks/${artworkId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      router.refresh();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={status === "working"}
        className={className}
      >
        {status === "working"
          ? "Deleting…"
          : status === "error"
            ? "Try again"
            : "Delete"}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete painting?"
        message={`Are you sure you want to delete "${displayTitle}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
