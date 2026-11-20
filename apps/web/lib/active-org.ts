// Module-level store, not React state -- apiFetch (not a component) must read the current
// value synchronously. Seeded by useMe from a real GET /api/me response; stays
// null until then, which apiFetch treats as "no org known yet" rather than a guessed id.
let activeOrgId: string | null = null
const listeners = new Set<(id: string) => void>()

export function getActiveOrgId(): string | null {
  return activeOrgId
}

export function setActiveOrgId(id: string): void {
  activeOrgId = id
  for (const listener of listeners) listener(id)
}

export function clearActiveOrgId(): void {
  activeOrgId = null
}

export function subscribe(cb: (id: string) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
