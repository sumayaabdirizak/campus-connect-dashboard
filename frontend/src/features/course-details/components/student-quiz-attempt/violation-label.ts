export function violationLabel(kind: string): string {
  if (kind === 'visibility') return 'You left the quiz window';
  if (kind === 'copy') return 'You copied content from this page';
  if (kind === 'paste') return 'You pasted content into the quiz';
  if (kind === 'screenshot') return 'Screenshot attempt detected';
  return 'Suspicious activity detected';
}
