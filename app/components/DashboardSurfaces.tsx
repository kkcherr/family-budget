/**
 * The dashboard "at a glance" reminders: credit card payments due, cash
 * position across accounts, and upcoming big payments. These are wired to real
 * data in a later phase — for now they show calm empty states so the layout
 * reflects where each piece will live.
 */
export default function DashboardSurfaces() {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <SurfaceCard
        icon="💳"
        title="Credit cards"
        body="Track your Amex, Capital One and Tesco balances and see “pay £X by [date].”"
      />
      <SurfaceCard
        icon="🏦"
        title="Cash position"
        body="What you hold across accounts vs. what you owe on cards — your genuinely free money."
      />
      <SurfaceCard
        icon="📅"
        title="Upcoming big payments"
        body="Holidays, the dog’s op, college — each with how much you still need to set aside."
      />
    </section>
  );
}

function SurfaceCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{body}</p>
      <p className="mt-2 inline-block rounded-full bg-lavender-100 px-2 py-0.5 text-[11px] font-medium text-lavender-700">
        Coming soon
      </p>
    </div>
  );
}
