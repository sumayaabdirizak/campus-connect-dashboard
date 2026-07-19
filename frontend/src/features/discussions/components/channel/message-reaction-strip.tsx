import { QUICK_REACTIONS } from './message-menu-types';

export function ReactionStrip({
  onReact
}: {
  onReact: (emoji: string) => void;
}) {
  return (
    <div
      role='toolbar'
      aria-label='Quick reactions'
      className='flex items-center gap-0.5 rounded-md border bg-popover px-1 py-1 shadow-md'
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type='button'
          className='flex h-8 w-8 items-center justify-center rounded text-lg transition-transform hover:scale-110 hover:bg-muted'
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
