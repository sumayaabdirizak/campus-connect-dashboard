export function setQueryParam(
  current: URLSearchParams,
  key: string,
  value: string | null
): string {
  const next = new URLSearchParams(current)
  if (value == null) next.delete(key)
  else next.set(key, value)
  const qs = next.toString()
  return qs ? `?${qs}` : ''
}
