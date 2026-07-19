let _collapseState: Record<string, boolean> = {}
let _collapseListeners = new Set<() => void>()

export function getCollapseSnapshot() {
  return _collapseState
}

export function subscribeCollapse(cb: () => void) {
  _collapseListeners.add(cb)
  return () => {
    _collapseListeners.delete(cb)
  }
}

export function toggleCollapse(key: string) {
  const wasCollapsed = _collapseState[key] !== false
  _collapseState = { ..._collapseState, [key]: !wasCollapsed }
  _collapseListeners.forEach((cb) => cb())
}

export function isCategoryCollapsed(key: string) {
  return _collapseState[key] !== false
}
