export type CellState = 'allow' | 'inherit' | 'deny';

export function toBigInt(input: string | undefined | null): bigint {
  if (!input) return BigInt(0);
  try {
    return BigInt(input);
  } catch {
    return BigInt(0);
  }
}

export function decodeState(allow: bigint, deny: bigint, bit: bigint): CellState {
  // Both bits set is invalid; treat allow as winner (backend normalizes on write).
  if ((allow & bit) !== BigInt(0)) return 'allow';
  if ((deny & bit) !== BigInt(0)) return 'deny';
  return 'inherit';
}

export function applyState(
  allow: bigint,
  deny: bigint,
  bit: bigint,
  next: CellState
): { allow: string; deny: string } {
  let nextAllow = allow;
  let nextDeny = deny;
  if (next === 'allow') {
    nextAllow |= bit;
    nextDeny &= ~bit;
  } else if (next === 'deny') {
    nextAllow &= ~bit;
    nextDeny |= bit;
  } else {
    nextAllow &= ~bit;
    nextDeny &= ~bit;
  }
  return { allow: nextAllow.toString(), deny: nextDeny.toString() };
}
