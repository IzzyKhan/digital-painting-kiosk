import P5 from "p5";
import type p5 from "p5";
import type { BrushParams } from "@/lib/brushParams";

type PaintingSketchOptions = {
  container: HTMLElement;
  getParams: () => BrushParams;
  isDrawingBlocked?: () => boolean;
};

export type PaintingSketchApi = {
  clearArt: () => void;
  exportArt: () => void;
  destroy: () => void;
  getArtworkPngBase64: () => string | null;
  loadArtworkFromImageUrl: (imageUrl: string) => Promise<void>;
  whenReady: () => Promise<void>;
};

const BG_HUE = 0;
const BG_SAT = 0;
const BG_BRIGHT = 12;

function getActiveSize(brush: BrushParams) {
  return brush.shape === "eraser" ? brush.eraserSize : brush.size;
}

export function createPaintingSketch(
  options: PaintingSketchOptions
): PaintingSketchApi {
  const { container, getParams } = options;
  const isDrawingBlocked = options.isDrawingBlocked ?? (() => false);

  let pInstance: P5 | undefined;
  let artLayer: p5.Graphics | undefined;
  let destroyed = false;
  let ready = false;
  let resolveReady: (() => void) | undefined;
  let removePointerListeners: (() => void) | undefined;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const markReady = () => {
    if (ready || !artLayer || !pInstance) return;
    ready = true;
    resolveReady?.();
    resolveReady = undefined;
  };

  const makeLayer = (w: number, h: number): p5.Graphics => {
    const layer = pInstance!.createGraphics(w, h);
    layer.pixelDensity(1);
    layer.colorMode(pInstance!.HSB, 360, 100, 100, 100);
    return layer;
  };

  // Keeps the canvas + art layer matched to the container size. The art layer
  // is the single source of truth for the painting; we only recreate it when
  // the size actually changes, preserving existing content.
  const syncSize = () => {
    const p = pInstance;
    if (!p || destroyed) return;

    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w === 0 || h === 0) return;

    if (p.width !== w || p.height !== h) {
      p.resizeCanvas(w, h);
    }

    if (!artLayer) {
      const layer = makeLayer(w, h);
      layer.background(BG_HUE, BG_SAT, BG_BRIGHT);
      artLayer = layer;
    } else if (artLayer.width !== w || artLayer.height !== h) {
      const next = makeLayer(w, h);
      next.background(BG_HUE, BG_SAT, BG_BRIGHT);
      next.image(artLayer, 0, 0, w, h);
      artLayer.remove();
      artLayer = next;
    }

    markReady();
  };

  const clearArt = () => {
    if (!artLayer) return;
    artLayer.background(BG_HUE, BG_SAT, BG_BRIGHT);
  };

  const getArtworkDataUrl = (): string | null => {
    if (!artLayer) return null;
    const canvas = (artLayer as unknown as { canvas: HTMLCanvasElement }).canvas;
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const getArtworkPngBase64 = (): string | null => {
    const dataUrl = getArtworkDataUrl();
    if (!dataUrl) return null;
    const comma = dataUrl.indexOf(",");
    return comma >= 0 ? dataUrl.slice(comma + 1) : null;
  };

  const exportArt = () => {
    if (!artLayer) return;
    const canvas = (artLayer as unknown as { canvas: HTMLCanvasElement }).canvas;

    const triggerDownload = (href: string, revoke?: () => void) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = `digital-painting-${Date.now()}.png`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (revoke) setTimeout(revoke, 0);
    };

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          const dataUrl = getArtworkDataUrl();
          if (dataUrl) triggerDownload(dataUrl);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        triggerDownload(objectUrl, () => URL.revokeObjectURL(objectUrl));
      }, "image/png");
    } catch {
      const dataUrl = getArtworkDataUrl();
      if (dataUrl) triggerDownload(dataUrl);
    }
  };

  const loadImageElement = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load artwork image"));
      img.src = src;
    });

  const loadArtworkFromImageUrl = async (imageUrl: string): Promise<void> => {
    await readyPromise;
    syncSize();

    const layer = artLayer;
    if (destroyed || !layer) {
      throw new Error("Sketch not ready");
    }

    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load artwork image");
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImageElement(objectUrl);
      if (destroyed || artLayer !== layer) {
        throw new Error("Load cancelled");
      }

      layer.background(BG_HUE, BG_SAT, BG_BRIGHT);
      const ctx = (
        layer as unknown as { drawingContext: CanvasRenderingContext2D }
      ).drawingContext;
      ctx.drawImage(img, 0, 0, layer.width, layer.height);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const sketch = (p: P5) => {
    pInstance = p;

    let canvasEl: HTMLCanvasElement | null = null;
    let ptrX = 0;
    let ptrY = 0;
    let ptrOnCanvas = false;
    let ptrPressed = false;
    let hasStablePtr = false;

    const maxPtrJump = () => Math.max(p.width, p.height) * 0.35;

    const clientToCanvas = (clientX: number, clientY: number) => {
      if (!canvasEl || p.width === 0 || p.height === 0) return null;

      const rect = canvasEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      return {
        x: ((clientX - rect.left) / rect.width) * p.width,
        y: ((clientY - rect.top) / rect.height) * p.height,
      };
    };

    const eventToCanvas = (e: PointerEvent) => {
      if (!canvasEl || p.width === 0 || p.height === 0) return null;

      if (e.target === canvasEl) {
        const elW = canvasEl.offsetWidth;
        const elH = canvasEl.offsetHeight;
        if (elW > 0 && elH > 0) {
          return {
            x: (e.offsetX / elW) * p.width,
            y: (e.offsetY / elH) * p.height,
          };
        }
      }

      return clientToCanvas(e.clientX, e.clientY);
    };

    const applyCanvasPoint = (x: number, y: number, force: boolean) => {
      const onCanvas =
        x >= 0 && x < p.width && y >= 0 && y < p.height;

      if (!force && hasStablePtr) {
        const jump = Math.hypot(x - ptrX, y - ptrY);
        if (jump > maxPtrJump()) {
          return false;
        }
      }

      ptrX = x;
      ptrY = y;
      if (onCanvas) {
        hasStablePtr = true;
      }
      ptrOnCanvas = onCanvas;
      return true;
    };

    const updatePointer = (e: PointerEvent, force = false) => {
      const pt = eventToCanvas(e);
      if (!pt) {
        ptrOnCanvas = false;
        return;
      }

      applyCanvasPoint(pt.x, pt.y, force);
    };

    const pointerOnCanvas = () =>
      p.width > 0 && p.height > 0 && ptrOnCanvas;

    const drawTriangleAt = (
      target: P5 | p5.Graphics,
      x: number,
      y: number,
      size: number
    ) => {
      const half = size / 2;
      target.triangle(x, y - half, x - half, y + half, x + half, y + half);
    };

    const drawShape = (
      target: P5 | p5.Graphics,
      x: number,
      y: number,
      brush: BrushParams,
      size: number
    ) => {
      if (brush.shape === "circle") {
        target.circle(x, y, size);
      } else if (brush.shape === "square") {
        target.rectMode(p.CENTER);
        target.square(x, y, size);
      } else if (brush.shape === "triangle") {
        drawTriangleAt(target, x, y, size);
      }
    };

    const drawPreview = (x: number, y: number) => {
      const brush = getParams();
      const activeSize = getActiveSize(brush);

      p.push();

      if (brush.shape === "eraser") {
        p.noFill();
        p.stroke(0, 0, 90, 80);
        p.strokeWeight(2);
        p.circle(x, y, activeSize);

        p.noStroke();
        p.fill(BG_HUE, BG_SAT, BG_BRIGHT, 60);
        p.circle(x, y, activeSize);
      } else {
        p.noStroke();
        p.fill(brush.hue, brush.saturation, brush.brightness, brush.alpha * 0.4);
        drawShape(p, x, y, brush, activeSize);

        p.noFill();
        p.stroke(brush.hue, brush.saturation, brush.brightness, 100);
        p.strokeWeight(2);
        drawShape(p, x, y, brush, activeSize);
      }

      p.pop();
    };

    const drawBrush = (layer: p5.Graphics, x: number, y: number) => {
      const brush = getParams();
      const activeSize = getActiveSize(brush);

      layer.push();
      layer.noStroke();

      if (brush.shape === "eraser") {
        layer.fill(BG_HUE, BG_SAT, BG_BRIGHT, 100);
        layer.circle(x, y, activeSize);
      } else {
        layer.fill(brush.hue, brush.saturation, brush.brightness, brush.alpha);
        drawShape(layer, x, y, brush, activeSize);
      }

      layer.pop();
    };

    const strokeBetween = (
      layer: p5.Graphics,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
      const brush = getParams();
      const activeSize = getActiveSize(brush);

      // spacing 0 -> dense interpolation (smooth). Higher spacing widens the gap
      // between stamps; at the top of the range only the frame's end point is
      // stamped, so fast motion scatters discrete marks (the "lag" effect).
      const spacing = Math.min(Math.max(brush.spacing ?? 0, 0), 100) / 100;
      const minStep = Math.max(activeSize / 4, 1);
      const maxStep = minStep + activeSize * 8;
      const step = minStep + (maxStep - minStep) * spacing * spacing;

      const dist = Math.hypot(x2 - x1, y2 - y1);
      if (dist < 0.5) {
        drawBrush(layer, x2, y2);
        return;
      }

      const count = Math.floor(dist / step);

      for (let i = 1; i <= count; i++) {
        const t = i / count;
        drawBrush(layer, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      }
      drawBrush(layer, x2, y2);
    };

    // Track stroke anchor ourselves. p5 mouse coords can be wrong in Chrome
    // fullscreen near the top edge, so pointer position comes from native
    // pointer events + getBoundingClientRect instead.
    let strokeActive = false;
    let lastStrokeX = 0;
    let lastStrokeY = 0;

    const beginStroke = () => {
      if (isDrawingBlocked() || !pointerOnCanvas() || !artLayer) return;
      strokeActive = true;
      lastStrokeX = ptrX;
      lastStrokeY = ptrY;
      drawBrush(artLayer, lastStrokeX, lastStrokeY);
    };

    const endStroke = () => {
      strokeActive = false;
    };

    const continueStroke = () => {
      if (isDrawingBlocked()) {
        if (strokeActive) endStroke();
        return;
      }
      if (!strokeActive || !ptrPressed || !pointerOnCanvas() || !artLayer) {
        return;
      }

      const x2 = ptrX;
      const y2 = ptrY;

      // Reject coordinate teleports (resize glitches, bad pointer events).
      const maxJump = Math.max(p.width, p.height) * 0.35;
      const jump = Math.hypot(x2 - lastStrokeX, y2 - lastStrokeY);
      if (jump > maxJump) {
        return;
      }

      strokeBetween(artLayer, lastStrokeX, lastStrokeY, x2, y2);
      lastStrokeX = x2;
      lastStrokeY = y2;
    };

    const attachPointerListeners = (el: HTMLCanvasElement) => {
      const onPointerMove = (e: PointerEvent) => {
        updatePointer(e);
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        updatePointer(e, true);
        if (isDrawingBlocked() || !pointerOnCanvas() || !artLayer) return;

        el.setPointerCapture(e.pointerId);
        ptrPressed = true;
        beginStroke();
      };

      const onPointerUp = (e: PointerEvent) => {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
        updatePointer(e, true);
        ptrPressed = false;
        endStroke();
      };

      const onPointerEnter = (e: PointerEvent) => {
        updatePointer(e, true);
      };

      const onPointerLeave = () => {
        ptrOnCanvas = false;
      };

      el.addEventListener("pointermove", onPointerMove, { passive: true });
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("pointerup", onPointerUp);
      el.addEventListener("pointercancel", onPointerUp);
      el.addEventListener("pointerenter", onPointerEnter);
      el.addEventListener("pointerleave", onPointerLeave);

      removePointerListeners = () => {
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerdown", onPointerDown);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
        el.removeEventListener("pointerenter", onPointerEnter);
        el.removeEventListener("pointerleave", onPointerLeave);
        canvasEl = null;
      };
    };

    p.setup = () => {
      p.pixelDensity(1);
      const canvas = p.createCanvas(100, 100);
      canvas.parent(container);
      canvasEl = canvas.elt as HTMLCanvasElement;
      attachPointerListeners(canvasEl);
      p.noCursor();
      p.colorMode(p.HSB, 360, 100, 100, 100);
      syncSize();
    };

    p.draw = () => {
      if (p.width === 0 || p.height === 0 || !artLayer) {
        syncSize();
        return;
      }

      p.background(BG_HUE, BG_SAT, BG_BRIGHT);
      p.image(artLayer, 0, 0);

      const blocked = isDrawingBlocked();

      if (!blocked && pointerOnCanvas()) {
        drawPreview(ptrX, ptrY);
      }

      continueStroke();

      if (strokeActive && !ptrPressed) {
        endStroke();
      }
    };

    p.windowResized = () => {
      endStroke();
      hasStablePtr = false;
      syncSize();
    };
  };

  const instance = new P5(sketch);

  return {
    clearArt,
    exportArt,
    getArtworkPngBase64,
    loadArtworkFromImageUrl,
    whenReady: () => readyPromise,
    destroy: () => {
      destroyed = true;
      removePointerListeners?.();
      removePointerListeners = undefined;
      resolveReady?.();
      resolveReady = undefined;
      artLayer = undefined;
      pInstance = undefined;
      instance.remove();
    },
  };
}
