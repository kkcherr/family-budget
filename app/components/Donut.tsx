"use client";

import { useId } from "react";
import { formatCurrency, formatPercent } from "@/lib/money";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * A soft donut/ring chart. Renders slices proportional to value, with a calm
 * gap between them and a center label. Pure SVG — no chart library.
 */
export default function Donut({
  slices,
  centerLabel,
  centerValue,
  size = 200,
  thickness = 26,
  currency = "GBP",
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  thickness?: number;
  currency?: string;
}) {
  const id = useId();
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const total = slices.reduce((s, x) => s + x.value, 0);
  const positive = slices.filter((s) => s.value > 0);

  let offset = 0;
  const gap = positive.length > 1 ? 2 : 0; // px gap between slices

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
        className="shrink-0 -rotate-90"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#F2EEFA"
          strokeWidth={thickness}
        />
        {total > 0 &&
          positive.map((slice, i) => {
            const fraction = slice.value / total;
            const len = Math.max(0, fraction * circumference - gap);
            const dasharray = `${len} ${circumference - len}`;
            const dashoffset = -offset;
            offset += fraction * circumference;
            return (
              <circle
                key={`${id}-${i}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
              />
            );
          })}
        {/* Center label rotated back upright */}
        <g transform={`rotate(90 ${cx} ${cy})`}>
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-ink-soft"
            style={{ fontSize: 12 }}
          >
            {centerLabel}
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            className="fill-ink"
            style={{ fontSize: 22, fontWeight: 600 }}
          >
            {centerValue}
          </text>
        </g>
      </svg>

      <ul className="grid w-full grid-cols-1 gap-1.5 text-sm">
        {positive.length === 0 && (
          <li className="text-ink-faint">No spending logged yet.</li>
        )}
        {positive.map((slice, i) => (
          <li key={`${id}-legend-${i}`} className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="flex-1 truncate text-ink">{slice.label}</span>
            <span className="tabular-nums text-ink-soft">
              {formatPercent(total > 0 ? slice.value / total : 0)}
            </span>
            <span className="w-20 text-right tabular-nums text-ink-faint">
              {formatCurrency(slice.value, currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
