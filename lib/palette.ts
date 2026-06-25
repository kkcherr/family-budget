import { Section } from "./types";

/**
 * Section band styling (the "Band A / Band B" colour roles): Fixed sits on
 * lavender, Variable on warm butter, Savings on sage. Class strings are literal
 * so Tailwind keeps them.
 */
export const SECTION_BAND: Record<
  Section,
  { bg: string; text: string; border: string }
> = {
  fixed: {
    bg: "bg-lavender-100",
    text: "text-lavender-700",
    border: "border-lavender-200",
  },
  variable: {
    bg: "bg-butter-100",
    text: "text-butter-700",
    border: "border-butter-200",
  },
  savings: {
    bg: "bg-sage-100",
    text: "text-sage-600",
    border: "border-sage-400/40",
  },
};

/** A soft base color per section, used for donut slices and accents. */
export const SECTION_COLORS: Record<Section, string> = {
  fixed: "#9F8FD9", // lavender (Band A)
  variable: "#E6D28C", // butter (Band B)
  savings: "#8FC3AC", // sage — savings leans positive
};

/**
 * Produce calm, distinct slice colors. Items within the same section get gentle
 * lightness variations so the donut stays in palette but remains readable.
 */
export function sliceColor(section: Section, indexInSection: number): string {
  const base = SECTION_COLORS[section];
  const lightenSteps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.58, 0.64];
  const amt = lightenSteps[Math.min(indexInSection, lightenSteps.length - 1)];
  return lighten(base, amt);
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return rgbToHex(lr, lg, lb);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
