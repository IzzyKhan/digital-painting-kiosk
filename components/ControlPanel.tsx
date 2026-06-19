"use client";

import { useEffect } from "react";
import type { BrushParams, BrushShape } from "@/lib/brushParams";
import Link from "next/link";
import { EmailArtworkForm } from "@/components/EmailArtworkForm";

const SHAPES: { id: BrushShape; label: string }[] = [
  { id: "circle", label: "Circle" },
  { id: "square", label: "Square" },
  { id: "triangle", label: "Triangle" },
  { id: "eraser", label: "Eraser" },
];

function colourToCss(hue: number, saturation: number, brightness: number) {
  return `hsl(${hue}, ${saturation}%, ${brightness * 0.55}%)`;
}

function isEraserMode(params: BrushParams) {
  return params.shape === "eraser";
}

function getActiveSize(params: BrushParams) {
  return isEraserMode(params) ? params.eraserSize : params.size;
}

type ControlPanelProps = {
  params: BrushParams;
  onParamsChange: (next: BrushParams) => void;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  onBlockCanvasInput: (blocked: boolean) => void;
  onClear: () => void;
  title: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  saveStatus: "idle" | "saving" | "success" | "error";
  saveMessage?: string;
  saveLabel?: string;
  saveDisabled?: boolean;
  savedArtworkId?: string | null;
};

const controlBtn =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border border-border bg-control px-4 text-base text-ink cursor-pointer transition-colors hover:bg-control-hover active:bg-control-active";
const controlBtnActive = "bg-accent-surface border-accent";
const slider = "w-full min-h-12 cursor-pointer accent-accent";

export function ControlPanel({
  params,
  onParamsChange,
  panelOpen,
  onPanelOpenChange,
  onBlockCanvasInput,
  onClear,
  title,
  onTitleChange,
  onSave,
  saveStatus,
  saveMessage,
  saveLabel = "Save to gallery",
  saveDisabled = false,
  savedArtworkId = null,
}: ControlPanelProps) {
  const eraser = isEraserMode(params);
  const activeSize = getActiveSize(params);

  useEffect(() => {
    const onPointerUp = () => onBlockCanvasInput(false);
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, [onBlockCanvasInput]);

  const setActiveSize = (value: number) => {
    if (eraser) {
      onParamsChange({ ...params, eraserSize: value });
    } else {
      onParamsChange({ ...params, size: value });
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open brush settings"
        aria-expanded={panelOpen}
        aria-controls="controls"
        className={`fixed top-4 right-4 z-20 min-h-12 min-w-12 rounded-control border border-border bg-control/70 backdrop-blur-md p-2 text-xl leading-none text-ink transition-[background,opacity] hover:bg-control-hover ${
          panelOpen ? "pointer-events-none opacity-0" : ""
        }`}
        onPointerDown={(e) => {
          e.preventDefault();
          onBlockCanvasInput(true);
        }}
        onClick={() => onPanelOpenChange(true)}
      >
        ⚙
      </button>

      <div
        role="presentation"
        aria-hidden={!panelOpen}
        className={`fixed inset-0 z-[25] bg-black/20 transition-opacity ${
          panelOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => onPanelOpenChange(false)}
      />

      <aside
        id="controls"
        aria-label="Drawing controls"
        className={`panel-controls fixed top-0 right-0 z-30 h-screen w-[280px] overflow-y-auto border-l border-border-subtle bg-surface/70 backdrop-blur-xs p-5 text-ink shadow-[-4px_0_24px_rgba(0,0,0,0.4)] transition-transform ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-2">
          <h1 className="m-0 text-xl font-semibold">Paint Lab</h1>
          <button
            type="button"
            className={`${controlBtn} px-3 text-lg leading-none`}
            aria-label="Close panel"
            onClick={() => onPanelOpenChange(false)}
          >
            ✕
          </button>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 text-[0.85rem] font-medium uppercase tracking-wide text-ink-muted">
            Shape
          </h2>
          <div className="flex flex-wrap gap-2">
            {SHAPES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`${controlBtn} ${
                  params.shape === id ? controlBtnActive : ""
                }`}
                onClick={() => onParamsChange({ ...params, shape: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section
          className={`mb-6 ${eraser ? "opacity-45" : ""}`}
          aria-disabled={eraser}
        >
          <h2 className="mb-3 text-[0.85rem] font-medium uppercase tracking-wide text-ink-muted">
            Colour
          </h2>

          <label className="mb-1 block text-[0.8rem] text-ink-muted" htmlFor="hue-slider">
            Hue
          </label>
          <input
            id="hue-slider"
            type="range"
            className={slider}
            min={0}
            max={360}
            value={params.hue}
            disabled={eraser}
            aria-label="Brush hue"
            onChange={(e) =>
              onParamsChange({ ...params, hue: Number(e.target.value) })
            }
          />

          <label
            className="mb-1 mt-2 block text-[0.8rem] text-ink-muted"
            htmlFor="saturation-slider"
          >
            Intensity
          </label>
          <input
            id="saturation-slider"
            type="range"
            className={slider}
            min={0}
            max={100}
            value={params.saturation}
            disabled={eraser}
            aria-label="Colour intensity"
            onChange={(e) =>
              onParamsChange({ ...params, saturation: Number(e.target.value) })
            }
          />

          <label
            className="mb-1 mt-2 block text-[0.8rem] text-ink-muted"
            htmlFor="brightness-slider"
          >
            Brightness
          </label>
          <input
            id="brightness-slider"
            type="range"
            className={slider}
            min={0}
            max={100}
            value={params.brightness}
            disabled={eraser}
            aria-label="Colour brightness"
            onChange={(e) =>
              onParamsChange({ ...params, brightness: Number(e.target.value) })
            }
          />

          <div className="mt-3 flex items-center gap-3">
            <div
              className="min-h-12 flex-1 rounded-control border border-border transition-[background]"
              style={{
                background: colourToCss(
                  params.hue,
                  params.saturation,
                  params.brightness
                ),
              }}
              aria-hidden
            />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-[0.85rem] font-medium uppercase tracking-wide text-ink-muted">
            {eraser ? "Eraser size" : "Size"}
          </h2>
          <input
            id="size-slider"
            type="range"
            className={slider}
            min={4}
            max={120}
            value={activeSize}
            aria-label="Brush or eraser size"
            onChange={(e) => setActiveSize(Number(e.target.value))}
          />
          <span className="mt-3 block text-[0.85rem] text-ink-muted">
            {eraser
              ? `Eraser ${Math.round(activeSize)}`
              : `Size ${Math.round(activeSize)}`}
          </span>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-[0.85rem] font-medium uppercase tracking-wide text-ink-muted">
            Spacing
          </h2>
          <input
            id="spacing-slider"
            type="range"
            className={slider}
            min={0}
            max={100}
            value={params.spacing}
            aria-label="Stroke spacing"
            onChange={(e) =>
              onParamsChange({ ...params, spacing: Number(e.target.value) })
            }
          />
          <span className="mt-3 block text-[0.85rem] text-ink-muted">
            {params.spacing === 0
              ? "Smooth"
              : `Scatter ${Math.round(params.spacing)}`}
          </span>
          <p className="mt-1 text-[0.75rem] leading-snug text-ink-faint">
            Higher values break the stroke into stamps — move fast for scattered
            specks (works with the eraser too).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-[0.85rem] font-medium uppercase tracking-wide text-ink-muted">
            Actions
          </h2>
 
          <label
            className="mb-1 block text-[0.8rem] text-ink-muted"
            htmlFor="artwork-title"
          >
            Title (optional)
          </label>
          <input
            id="artwork-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={120}
            placeholder="My painting"
            className="mb-3 w-full rounded-control border border-border bg-control px-3 py-2 text-ink placeholder:text-ink-faint"
          />

          <div className="flex flex-wrap gap-2">
            <button type="button" className={controlBtn} onClick={onClear}>
              Clear
            </button>
            <button
              type="button"
              className={controlBtn}
              onClick={onSave}
              disabled={saveStatus === "saving" || saveDisabled}
            >
              {saveStatus === "saving" ? "Saving…" : saveLabel}
            </button>
            <Link href="/gallery" className={controlBtn}>
              Gallery
            </Link>
          </div>

          {saveMessage && (
            <p
              className={`mt-3 text-sm ${
                saveStatus === "error" ? "text-danger" : "text-ink-muted"
              }`}
            >
              {saveMessage}
            </p>
          )}

          {savedArtworkId && (
            <EmailArtworkForm
              key={savedArtworkId}
              artworkId={savedArtworkId}
              className="mt-4 border-t border-border-subtle pt-4"
            />
          )}
        </section>
      </aside>
    </>
  );
}