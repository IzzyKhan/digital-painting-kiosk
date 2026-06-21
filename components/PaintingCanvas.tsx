"use client";

import { useEffect, useRef } from "react";
import type { BrushParams } from "@/lib/brushParams";
import type { PaintingSketchApi } from "@/sketches/paintingSketch";

type SketchActions = Pick<
  PaintingSketchApi,
  "clearArt" | "getArtworkPngBase64" | "loadArtworkFromImageUrl"
>;

type PaintingCanvasProps = {
  params: BrushParams;
  onReady?: (api: SketchActions) => void;
};

export function PaintingCanvas({ params, onReady }: PaintingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paramsRef = useRef(params);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let api: PaintingSketchApi | undefined;

    import("@/sketches/paintingSketch").then(({ createPaintingSketch }) => {
      if (cancelled || !containerRef.current) return;
      api = createPaintingSketch({
        container: containerRef.current,
        getParams: () => paramsRef.current,
        isDrawingBlocked: () => false,
      });
      void api.whenReady().then(() => {
        if (cancelled || !api) return;
        onReadyRef.current?.({
          clearArt: api.clearArt,
          getArtworkPngBase64: api.getArtworkPngBase64,
          loadArtworkFromImageUrl: api.loadArtworkFromImageUrl,
        });
      });
    });

    document.body.classList.add("drawing-mode");

    return () => {
      cancelled = true;
      api?.destroy();
      document.body.classList.remove("drawing-mode");
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none [&_canvas]:block"
      aria-label="Drawing canvas"
    />
  );
}
