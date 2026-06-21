import type { BrushShape } from "@/lib/brushParams";

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "block shrink-0",
  "aria-hidden": true,
};

export function BrushToolIcon({ shape }: { shape: BrushShape }) {
  switch (shape) {
    case "circle":
      return (
        <svg {...iconProps}>
          <circle cx="8" cy="8" r="4.5" />
        </svg>
      );
    case "square":
      return (
        <svg {...iconProps}>
          <rect x="3.5" y="3.5" width="9" height="9" />
        </svg>
      );
    case "triangle":
      return (
        <svg {...iconProps}>
          <path d="M8 3.5 13.5 12.5 2.5 12.5Z" />
        </svg>
      );
    case "eraser":
      return (
        <svg {...iconProps}>
          <path d="M3.5 9.5 8.5 4.5 12.5 8.5 7.5 13.5Z" />
          <path d="M3 14.5h10" />
        </svg>
      );
  }
}
