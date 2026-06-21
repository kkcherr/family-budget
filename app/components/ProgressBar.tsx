/**
 * Soft progress bar showing actual vs target. Fills lavender while within
 * budget; turns a warm blush when the category is overspent. Capped visually
 * at 100% with the overspend conveyed by color, not a jarring overflow.
 */
export default function ProgressBar({
  ratio,
  overspent,
  savings = false,
}: {
  ratio: number; // actual / target, 0..1+
  overspent?: boolean;
  savings?: boolean;
}) {
  const pct = Math.max(0, Math.min(ratio, 1)) * 100;

  const fill = overspent
    ? "bg-blush-500"
    : savings
    ? "bg-sage-400"
    : "bg-lavender-400";

  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-lavender-100"
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
