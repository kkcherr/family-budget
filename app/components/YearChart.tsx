import { YearMonthPoint } from "@/lib/queries";
import { formatCurrency } from "@/lib/money";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Year-to-date charts (pure SVG, no library):
 *  - grouped monthly bars: spent (lavender) vs saved (sage)
 *  - cumulative lines: running total spent and saved across the year
 */
export default function YearChart({
  points,
  currency,
}: {
  points: YearMonthPoint[];
  currency: string;
}) {
  const W = 700;
  const padL = 48;
  const padR = 12;

  // ---- Bars ----
  const barsH = 230;
  const barsTop = 12;
  const barsBottom = barsH - 26;
  const plotW = W - padL - padR;
  const plotH = barsBottom - barsTop;
  const bandW = plotW / 12;

  const maxMonthly = Math.max(
    1,
    ...points.map((p) => Math.max(p.spent, p.saved))
  );
  const yBar = (v: number) => barsBottom - (v / maxMonthly) * plotH;

  // ---- Cumulative ----
  const lineH = 200;
  const lineTop = 12;
  const lineBottom = lineH - 26;
  const linePlotH = lineBottom - lineTop;
  let cs = 0;
  let cv = 0;
  const cumSpent: number[] = [];
  const cumSaved: number[] = [];
  for (const p of points) {
    cs += p.spent;
    cv += p.saved;
    cumSpent.push(cs);
    cumSaved.push(cv);
  }
  const maxCum = Math.max(1, cumSpent[11], cumSaved[11]);
  const xAt = (i: number) => padL + bandW * (i + 0.5);
  const yCum = (v: number) => lineBottom - (v / maxCum) * linePlotH;

  const gridVals = [0, 0.5, 1];

  return (
    <div className="space-y-6">
      {/* Monthly bars */}
      <figure>
        <figcaption className="mb-2 flex items-center gap-3 px-1 text-xs text-ink-soft">
          <Legend color="#9F8FD9" label="Spent" />
          <Legend color="#9FCBB4" label="Saved" />
          <span className="ml-auto text-ink-faint">per month</span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${barsH}`} className="w-full" role="img" aria-label="Monthly spending and saving">
          {gridVals.map((g) => {
            const y = barsBottom - g * plotH;
            return (
              <g key={g}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#ECE7F7" />
                <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-ink-faint" style={{ fontSize: 10 }}>
                  {formatCurrency(maxMonthly * g, currency)}
                </text>
              </g>
            );
          })}
          {points.map((p, i) => {
            const bw = bandW * 0.3;
            const cx = padL + bandW * i + bandW / 2;
            const xSpent = cx - bw - 1;
            const xSaved = cx + 1;
            return (
              <g key={p.month}>
                {p.spent > 0 && (
                  <rect x={xSpent} y={yBar(p.spent)} width={bw} height={barsBottom - yBar(p.spent)} rx={3} fill="#9F8FD9">
                    <title>{`${MONTH_ABBR[i]}: ${formatCurrency(p.spent, currency)} spent`}</title>
                  </rect>
                )}
                {p.saved > 0 && (
                  <rect x={xSaved} y={yBar(p.saved)} width={bw} height={barsBottom - yBar(p.saved)} rx={3} fill="#9FCBB4">
                    <title>{`${MONTH_ABBR[i]}: ${formatCurrency(p.saved, currency)} saved`}</title>
                  </rect>
                )}
                <text x={cx} y={barsH - 8} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 10 }}>
                  {MONTH_ABBR[i][0]}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>

      {/* Cumulative lines */}
      <figure>
        <figcaption className="mb-2 flex items-center gap-3 px-1 text-xs text-ink-soft">
          <Legend color="#7C6BB0" label="Cumulative spent" />
          <Legend color="#5FA384" label="Cumulative saved" />
          <span className="ml-auto text-ink-faint">across the year</span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${lineH}`} className="w-full" role="img" aria-label="Cumulative spending and saving">
          {gridVals.map((g) => {
            const y = lineBottom - g * linePlotH;
            return (
              <g key={g}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#ECE7F7" />
                <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-ink-faint" style={{ fontSize: 10 }}>
                  {formatCurrency(maxCum * g, currency)}
                </text>
              </g>
            );
          })}
          <CumulativeLine values={cumSpent} xAt={xAt} yAt={yCum} color="#7C6BB0" />
          <CumulativeLine values={cumSaved} xAt={xAt} yAt={yCum} color="#5FA384" />
          {points.map((p, i) => (
            <text key={p.month} x={xAt(i)} y={lineH - 8} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 10 }}>
              {MONTH_ABBR[i][0]}
            </text>
          ))}
        </svg>
      </figure>
    </div>
  );
}

function CumulativeLine({
  values,
  xAt,
  yAt,
  color,
}: {
  values: number[];
  xAt: (i: number) => number;
  yAt: (v: number) => number;
  color: string;
}) {
  const pts = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  return (
    <>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(v)} r={2.5} fill={color} />
      ))}
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
