export type BrushShape = "circle" | "square" | "triangle" | "eraser";

export type BrushParams = {
  shape: BrushShape;
  hue: number;
  saturation: number;
  brightness: number;
  size: number;
  eraserSize: number;
  alpha: number;
  // 0 = smooth continuous stroke. Higher values drop interpolation so fast
  // movement scatters discrete stamps (the "lag" effect), for both brush and eraser.
  spacing: number;
};

export const DEFAULT_BRUSH_PARAMS: BrushParams = {
  shape: "circle",
  hue: 200,
  saturation: 80,
  brightness: 95,
  size: 48,
  eraserSize: 56,
  alpha: 90,
  spacing: 0,
};

export function isBrushParams(value: unknown): value is BrushParams {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.shape === "string" &&
    typeof p.hue === "number" &&
    typeof p.saturation === "number" &&
    typeof p.brightness === "number" &&
    typeof p.size === "number" &&
    typeof p.eraserSize === "number" &&
    typeof p.alpha === "number" &&
    // Optional for backward compatibility with artworks saved before spacing existed.
    (p.spacing === undefined || typeof p.spacing === "number")
  );
}

export function normalizeBrushParams(value: BrushParams): BrushParams {
  return { ...DEFAULT_BRUSH_PARAMS, ...value };
}

// Normalises an optional, untrusted artwork title to a clean value or null.
// Rejects empty strings and the literal "undefined"/"null" that can leak in
// from clients that stringify a missing value.
export function sanitizeArtworkTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return null;
  return trimmed.slice(0, 120);
}

// Deterministic across server and client (pinned locale + timezone) to avoid
// hydration mismatches from per-environment date formatting.
const ARTWORK_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatArtworkDate(value: Date | string): string {
  return ARTWORK_DATE_FORMAT.format(new Date(value));
}