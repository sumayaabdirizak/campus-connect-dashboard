export function violationLabel(kind: string): string {
  if (kind === 'visibility' || kind === 'blur') {
    return 'Tab switch / left the quiz window';
  }
  if (kind === 'copy') return 'You copied content from this page';
  if (kind === 'paste') return 'You pasted content into the quiz';
  if (kind === 'screenshot') return 'Screenshot attempt detected';
  return 'Suspicious activity detected';
}

/** Short label for teacher live-monitor tiles. */
export function violationKindShort(kind: string): string {
  if (kind === 'visibility' || kind === 'blur') return 'Left window';
  if (kind === 'copy') return 'Copy';
  if (kind === 'paste') return 'Paste';
  if (kind === 'screenshot') return 'Screenshot';
  return 'Violation';
}
