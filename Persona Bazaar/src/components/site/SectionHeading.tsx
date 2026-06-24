export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-coral">{eyebrow}</div>
        )}
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
