"use client";

import { useEffect, useRef } from "react";
import type { BrushParams, BrushShape } from "@/lib/brushParams";

const SHAPE_KEYS: Record<string, BrushShape> = {
  c: "circle",
  s: "square",
  t: "triangle",
  e: "eraser",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type UsePaintingKeyboardOptions = {
  params: BrushParams;
  onParamsChange: (next: BrushParams) => void;
};

export function usePaintingKeyboard({
  params,
  onParamsChange,
}: UsePaintingKeyboardOptions) {
  const paramsRef = useRef(params);
  const onParamsChangeRef = useRef(onParamsChange);
  const saturationDir = useRef(1);
  const brightnessDir = useRef(1);
  const opacityDir = useRef(1);

  paramsRef.current = params;
  onParamsChangeRef.current = onParamsChange;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const p = paramsRef.current;
      const key = e.key;
      const keyLower = key.toLowerCase();
      let next: BrushParams | null = null;

      if (keyLower in SHAPE_KEYS) {
        next = { ...p, shape: SHAPE_KEYS[keyLower] };
      } else if (keyLower === "h" && p.shape !== "eraser") {
        next = { ...p, hue: (p.hue + 5) % 360 };
      } else if (keyLower === "i" && p.shape !== "eraser") {
        if (p.saturation >= 100) saturationDir.current = -1;
        if (p.saturation <= 0) saturationDir.current = 1;
        next = {
          ...p,
          saturation: clamp(
            p.saturation + 5 * saturationDir.current,
            0,
            100
          ),
        };
      } else if (keyLower === "b" && p.shape !== "eraser") {
        if (p.brightness >= 100) brightnessDir.current = -1;
        if (p.brightness <= 0) brightnessDir.current = 1;
        next = {
          ...p,
          brightness: clamp(
            p.brightness + 5 * brightnessDir.current,
            0,
            100
          ),
        };
      } else if (keyLower === "o" && p.shape !== "eraser") {
        if (p.alpha >= 100) opacityDir.current = -1;
        if (p.alpha <= 5) opacityDir.current = 1;
        next = {
          ...p,
          alpha: clamp(p.alpha + 5 * opacityDir.current, 5, 100),
        };
      } else if (key === "+" || key === "=") {
        if (p.shape === "eraser") {
          next = { ...p, eraserSize: clamp(p.eraserSize + 4, 4, 120) };
        } else {
          next = { ...p, size: clamp(p.size + 4, 4, 120) };
        }
      } else if (key === "-") {
        if (p.shape === "eraser") {
          next = { ...p, eraserSize: clamp(p.eraserSize - 4, 4, 120) };
        } else {
          next = { ...p, size: clamp(p.size - 4, 4, 120) };
        }
      }

      if (next) {
        e.preventDefault();
        onParamsChangeRef.current(next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}