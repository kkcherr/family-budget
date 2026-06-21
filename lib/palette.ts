import { CategoryGroup } from "./types";

/** A soft base color per group, used for donut slices and accents. */
export const GROUP_COLORS: Record<CategoryGroup, string> = {
  essentials: "#9F8FD9", // lavender
  lifestyle: "#B7A6E0", // light lavender
  health_family: "#C9B8E8", // pale lavender
  financial: "#9FCBB4", // sage (savings/financial leans positive)
};

/**
 * Produce a list of distinct, calm slice colors. Categories within the same
 * group get gentle lightness variations so the donut stays in palette but
 * remains readable.
 */
export function sliceColor(group: CategoryGroup, indexInGroup: number): string {
  const base = GROUP_COLORS[group];
  // Lighten progressively for later items in the same group.
  const lightenSteps = [0, 0.12, 0.24, 0.36, 0.48];
  const amt = lightenSteps[Math.min(indexInGroup, lightenSteps.length - 1)];
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
