import { PERMISSION_ADMINISTRATOR } from "./constants.js";

export function hasPermission(mask, bit) {
  const m = BigInt(mask ?? 0n);
  if ((m & PERMISSION_ADMINISTRATOR) !== 0n) return true;
  return (m & BigInt(bit)) !== 0n;
}

export function combine(...masks) {
  let out = 0n;
  for (const m of masks) out |= BigInt(m ?? 0n);
  return out;
}
