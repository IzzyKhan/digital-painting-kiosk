"use client";

import { useEffect, useRef } from "react";
import type { BrushParams, BrushShape } from "@/lib/brushParams";

const SHAPE_KEYS: Record<string, BrushShape> = {
  "1": "circle",
  "2": "square",
  "3": "triangle",
  "4": "eraser",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type UsePaintingKeyboardOptions = {
  params: BrushParams;
  onParamsChange: (next: BrushParams) => void;
  onClear: () => void;
};

export function usePaintingKeyboard({
  params,
  onParamsChange,
  onClear,
}: UsePaintingKeyboardOptions) {
  const paramsRef = useRef(params);
  const onParamsChangeRef = useRef(onParamsChange);
  const onClearRef = useRef(onClear);
  const saturationDir = useRef(1);
  const brightnessDir = useRef(1);

  paramsRef.current = params;
  onParamsChangeRef.current = onParamsChange;
  onClearRef.current = onClear;

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
      let next: BrushParams | null = null;

      if (key in SHAPE_KEYS) {
        next = { ...p, shape: SHAPE_KEYS[key] };
      } else if (key === "c" && p.shape !== "eraser") {
        next = { ...p, hue: (p.hue + 5) % 360 };
      } else if (key === "s" && p.shape !== "eraser") {
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
      } else if (key === "b" && p.shape !== "eraser") {
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
      } else if (key === "r" || key === "R") {
        e.preventDefault();
        onClearRef.current();
        return;
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