"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import type { BrushParams, BrushShape } from "@/lib/brushParams";
import { BrushToolIcon } from "@/components/BrushToolIcon";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmailArtworkForm } from "@/components/EmailArtworkForm";

const SHAPES: { id: BrushShape; label: string; shortcut: string }[] = [
  { id: "circle", label: "Circle", shortcut: "C" },
  { id: "square", label: "Square", shortcut: "S" },
  { id: "triangle", label: "Triangle", shortcut: "T" },
  { id: "eraser", label: "Eraser", shortcut: "E" },
];

const PRESET_COLORS: { hue: number; saturation: number; brightness: number }[] =
  [
    { hue: 0, saturation: 0, brightness: 100 },
    { hue: 0, saturation: 0, brightness: 75 },
    { hue: 0, saturation: 0, brightness: 50 },
    { hue: 0, saturation: 0, brightness: 25 },
    { hue: 0, saturation: 85, brightness: 95 },
    { hue: 25, saturation: 95, brightness: 95 },
    { hue: 50, saturation: 95, brightness: 95 },
    { hue: 85, saturation: 80, brightness: 90 },
    { hue: 140, saturation: 70, brightness: 85 },
    { hue: 180, saturation: 75, brightness: 90 },
    { hue: 200, saturation: 80, brightness: 95 },
    { hue: 220, saturation: 85, brightness: 90 },
    { hue: 260, saturation: 70, brightness: 88 },
    { hue: 290, saturation: 65, brightness: 88 },
    { hue: 320, saturation: 70, brightness: 90 },
    { hue: 350, saturation: 80, brightness: 92 },
  ];

function colourToCss(hue: number, saturation: number, brightness: number) {
  return `hsl(${hue}, ${saturation}%, ${brightness * 0.55}%)`;
}

function colourToHex(hue: number, saturation: number, brightness: number) {
  const s = saturation / 100;
  const l = (brightness * 0.55) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function isEraserMode(params: BrushParams) {
  return params.shape === "eraser";
}

function getActiveSize(params: BrushParams) {
  return isEraserMode(params) ? params.eraserSize : params.size;
}

function shapeLabel(shape: BrushShape) {
  return SHAPES.find((item) => item.id === shape)?.label ?? shape;
}

function getBrushPreviewMark(
  shape: BrushShape,
  size: number,
  brushColor: string,
  alpha: number,
  eraser: boolean
): { className: string; style: CSSProperties } {
  const previewSize = Math.min(size, 40);
  const style: CSSProperties = {
    width: previewSize,
    height: previewSize,
    background: eraser ? "transparent" : brushColor,
    opacity: eraser ? 1 : alpha / 100,
    boxShadow: eraser ? "inset 0 0 0 1px #444" : undefined,
  };

  if (eraser || shape === "circle") {
    return { className: "rounded-full", style };
  }
  if (shape === "square") {
    return { className: "", style };
  }
  if (shape === "triangle") {
    return {
      className: "",
      style: { ...style, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" },
    };
  }

  return { className: "rounded-full", style };
}

function presetsMatch(
  a: { hue: number; saturation: number; brightness: number },
  b: BrushParams
) {
  return a.hue === b.hue && a.saturation === b.saturation && a.brightness === b.brightness;
}

type ControlPanelProps = {
  canvas: React.ReactNode;
  params: BrushParams;
  onParamsChange: (next: BrushParams) => void;
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

function SidebarSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-grid px-4 py-4 ${className}`}>
      {title ? (
        <h2 className="kiosk-section-label mb-3">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

function KioskSlider({ className, style, ...props }: ComponentProps<"input">) {
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  const val = Number(props.value ?? min);
  const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      {...props}
      className={`kiosk-slider ${className ?? ""}`}
      style={
        {
          ...style,
          "--slider-pct": `${pct}%`,
        } as CSSProperties
      }
    />
  );
}

function SliderRow({
  label,
  value,
  children,
  compact = false,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div>
      <div
        className={`flex items-center justify-between gap-2 ${
          compact ? "mb-1" : "mb-2.5"
        }`}
      >
        <span className="kiosk-section-label mb-0">{label}</span>
        <span className="font-mono text-[0.7rem] text-ink-muted">{value}</span>
      </div>
      <div className={compact ? "px-0.5" : "px-0.5 py-1"}>{children}</div>
    </div>
  );
}

export function ControlPanel({
  canvas,
  params,
  onParamsChange,
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
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const eraser = isEraserMode(params);
  const activeSize = getActiveSize(params);
  const brushColor = colourToCss(params.hue, params.saturation, params.brightness);
  const brushHex = colourToHex(params.hue, params.saturation, params.brightness);
  const brushPreview = getBrushPreviewMark(
    params.shape,
    activeSize,
    brushColor,
    params.alpha,
    eraser
  );

  const setActiveSize = (value: number) => {
    if (eraser) {
      onParamsChange({ ...params, eraserSize: value });
    } else {
      onParamsChange({ ...params, size: value });
    }
  };

  return (
    <div className="kiosk-chrome kiosk-shell">
      <header className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className="flex h-5 w-5 items-center justify-center text-[0.6rem] text-canvas"
            aria-hidden
          >
            <span className="inline-block h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-ink" />
          </span>
          <span className="text-ink-faint">/</span>
          <h1 className="m-0 font-medium tracking-tight text-ink">
            Digital Painting Kiosk
          </h1>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {savedArtworkId ? (
            <EmailArtworkForm
              key={savedArtworkId}
              artworkId={savedArtworkId}
              variant="inline"
              className="border-r border-grid pr-3"
            />
          ) : null}
          <Link href="/gallery" className="kiosk-pill shrink-0">
            Gallery
          </Link>
          <button
            type="button"
            className="kiosk-pill kiosk-pill-primary shrink-0"
            onClick={onSave}
            disabled={saveStatus === "saving" || saveDisabled}
          >
            {saveStatus === "saving" ? "Saving…" : saveLabel}
          </button>
        </div>
      </header>

      <div className="kiosk-body">
        <aside
          className="kiosk-cell flex flex-col items-center gap-1 border-r border-grid py-3"
          aria-label="Brush type"
        >
          {SHAPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={params.shape === id}
              className="kiosk-tool-btn"
              onClick={() => onParamsChange({ ...params, shape: id })}
            >
              <BrushToolIcon shape={id} />
            </button>
          ))}
        </aside>

        <main
          className="canvas-grid-bg relative min-h-0 overflow-hidden"
          aria-label="Main painting canvas"
        >
          {canvas}
        </main>

        <aside
          className="kiosk-cell flex min-h-0 flex-col border-l border-grid bg-canvas"
          aria-label="Brush and actions"
        >
          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
            <SidebarSection title="Artwork Title">
            <label className="sr-only" htmlFor="artwork-title">
              Title (optional)
            </label>
            <input
              id="artwork-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={120}
              placeholder="Title (optional)"
              className="kiosk-input mb-3 w-full"
            />

            {saveMessage ? (
              <p
                className={`text-xs ${
                  saveStatus === "error" ? "text-danger" : "text-ink-muted"
                }`}
              >
                {saveMessage}
              </p>
            ) : null}
          </SidebarSection>

          <SidebarSection
            title="Color"
            className={`py-3 ${eraser ? "opacity-40" : ""}`}
          >
            <div className="mb-2 grid grid-cols-8 gap-1">
              {PRESET_COLORS.map((preset) => {
                const css = colourToCss(
                  preset.hue,
                  preset.saturation,
                  preset.brightness
                );
                const active = !eraser && presetsMatch(preset, params);
                return (
                  <button
                    key={`${preset.hue}-${preset.saturation}-${preset.brightness}`}
                    type="button"
                    aria-label="Preset colour"
                    disabled={eraser}
                    className={`kiosk-swatch ${active ? "kiosk-swatch-active" : ""}`}
                    style={{ background: css }}
                    onClick={() => onParamsChange({ ...params, ...preset })}
                  />
                );
              })}
            </div>

            <div className="space-y-0.5">
              <SliderRow label="Hue" value={`${Math.round(params.hue)}°`} compact>
                <KioskSlider
                  className="kiosk-slider-compact"
                  min={0}
                  max={360}
                  value={params.hue}
                  disabled={eraser}
                  aria-label="Brush hue"
                  onChange={(e) =>
                    onParamsChange({ ...params, hue: Number(e.target.value) })
                  }
                />
              </SliderRow>
              <SliderRow
                label="Intensity"
                value={`${Math.round(params.saturation)}%`}
                compact
              >
                <KioskSlider
                  className="kiosk-slider-compact"
                  min={0}
                  max={100}
                  value={params.saturation}
                  disabled={eraser}
                  aria-label="Colour intensity"
                  onChange={(e) =>
                    onParamsChange({
                      ...params,
                      saturation: Number(e.target.value),
                    })
                  }
                />
              </SliderRow>
              <SliderRow
                label="Brightness"
                value={`${Math.round(params.brightness)}%`}
                compact
              >
                <KioskSlider
                  className="kiosk-slider-compact"
                  min={0}
                  max={100}
                  value={params.brightness}
                  disabled={eraser}
                  aria-label="Colour brightness"
                  onChange={(e) =>
                    onParamsChange({
                      ...params,
                      brightness: Number(e.target.value),
                    })
                  }
                />
              </SliderRow>
            </div>
          </SidebarSection>

          <SidebarSection
            title=""
            className={`py-2 ${eraser ? "opacity-40" : ""}`}
          >
            <SliderRow label="Opacity" value={`${Math.round(params.alpha)}%`}>
              <KioskSlider
                id="opacity-slider"
                min={5}
                max={100}
                value={params.alpha}
                disabled={eraser}
                aria-label="Brush opacity"
                onChange={(e) =>
                  onParamsChange({ ...params, alpha: Number(e.target.value) })
                }
              />
            </SliderRow>
          </SidebarSection>

          <SidebarSection title="" className="py-2">
            <SliderRow label="Size" value={`${Math.round(activeSize)}px`}>
              <KioskSlider
                id="size-slider"
                min={4}
                max={120}
                value={activeSize}
                aria-label="Brush or eraser size"
                onChange={(e) => setActiveSize(Number(e.target.value))}
              />
            </SliderRow>
          </SidebarSection>

          <SidebarSection title="" className="py-2">
            <SliderRow
              label="Spacing"
              value={
                params.spacing === 0 ? "Smooth" : `${Math.round(params.spacing)}`
              }
            >
              <KioskSlider
                id="spacing-slider"
                min={0}
                max={100}
                value={params.spacing}
                aria-label="Stroke spacing"
                onChange={(e) =>
                  onParamsChange({ ...params, spacing: Number(e.target.value) })
                }
              />
            </SliderRow>
          </SidebarSection>
          </div>

          <div className="shrink-0 border-t border-grid bg-sidebar-fixed">
          <SidebarSection title="Preview" className="pb-3">
            <div
              className="flex h-14 items-center justify-center border border-border-subtle bg-canvas-sunken"
              aria-label="Brush preview"
            >
              <div
                className={brushPreview.className}
                style={brushPreview.style}
              />
            </div>
          </SidebarSection>

          <SidebarSection title="Shortcuts" className="border-b-0 pt-3 [&_h2]:mb-1">
            <p className="mb-2 text-[0.65rem] text-ink-muted">
              Hold for continuous change.
            </p>
            <ul className="space-y-2 text-xs">
              {SHAPES.map(({ id, label, shortcut }) => (
                <li
                  key={id}
                  className={`flex items-center justify-between ${
                    params.shape === id ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  <span>{label}</span>
                  <span className="kiosk-kbd">{shortcut}</span>
                </li>
              ))}
              <li className="flex items-center justify-between text-ink-muted">
                <span>Hue / Intensity / Brightness</span>
                <span>
                  <span className="kiosk-kbd">H</span>{" "}
                  <span className="kiosk-kbd">I</span>{" "}
                  <span className="kiosk-kbd">B</span>
                </span>
              </li>
              <li className="flex items-center justify-between text-ink-muted">
                <span>Opacity</span>
                <span className="kiosk-kbd">O</span>
              </li>
              <li className="flex items-center justify-between text-ink-muted">
                <span>Size</span>
                <span>
                  <span className="kiosk-kbd">+</span>{" "}
                  <span className="kiosk-kbd">−</span>
                </span>
              </li>
            </ul>
          </SidebarSection>
          </div>
        </aside>
      </div>

      <footer
        className="flex items-center justify-between px-4 font-mono text-[0.7rem] text-ink-muted"
        aria-label="Canvas utilities"
      >
        <button
          type="button"
          className="kiosk-pill text-xs"
          onClick={() => setClearConfirmOpen(true)}
        >
          Clear canvas
        </button>
        <p className="m-0 tabular-nums">
          {shapeLabel(params.shape)} · {Math.round(activeSize)}px ·{" "}
          {Math.round(params.alpha)}% · {eraser ? "Eraser" : brushHex}
        </p>
      </footer>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear canvas?"
        message="This will erase your painting. You can't undo this action."
        confirmLabel="Clear canvas"
        cancelLabel="Cancel"
        onConfirm={() => {
          setClearConfirmOpen(false);
          onClear();
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
}
