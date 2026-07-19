'use client';

export function ConfidencePicker({
  value,
  onChange
}: {
  value: 'LOW' | 'MED' | 'HIGH';
  onChange: (v: 'LOW' | 'MED' | 'HIGH') => void;
}) {
  const choices = [
    { v: 'LOW' as const, label: 'Low', desc: '½ pts if right', tone: 'warning' },
    { v: 'MED' as const, label: 'Medium', desc: '¾ pts if right', tone: 'info' },
    { v: 'HIGH' as const, label: 'High', desc: 'Full pts · −½ if wrong', tone: 'success' }
  ];
  return (
    <div className='pt-2 border-t border-border/50'>
      <p className='text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide'>
        How confident are you?
      </p>
      <div className='grid grid-cols-3 gap-2'>
        {choices.map((c) => {
          const picked = value === c.v;
          const colour =
            c.tone === 'warning'
              ? picked
                ? 'border-warning bg-warning-muted text-warning-foreground'
                : 'border-border bg-background hover:border-warning'
              : c.tone === 'info'
                ? picked
                  ? 'border-info bg-info-muted text-info-foreground'
                  : 'border-border bg-background hover:border-info'
                : picked
                  ? 'border-success bg-success-muted text-success-foreground'
                  : 'border-border bg-background hover:border-success';
          return (
            <button
              key={c.v}
              type='button'
              onClick={() => onChange(c.v)}
              className={`p-2 rounded-lg border text-left transition-colors ${colour}`}
            >
              <p className='text-sm font-semibold'>{c.label}</p>
              <p className='text-[10px] opacity-80'>{c.desc}</p>
            </button>
          );
        })}
      </div>
      <p className='text-[10px] text-muted-foreground mt-2 italic'>
        Confidence scoring rewards calibrated thinking. Confidently wrong
        answers lose half-points; honest uncertainty doesn&apos;t.
      </p>
    </div>
  );
}
