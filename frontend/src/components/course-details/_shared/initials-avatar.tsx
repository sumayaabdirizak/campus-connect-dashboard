function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Small circular initials avatar for a name — shared roster-row look
 *  (course groups, attempts table, etc.). */
export function InitialsAvatar({
  name,
  className
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ${className ?? ''}`}
    >
      {initialsOf(name)}
    </div>
  );
}
