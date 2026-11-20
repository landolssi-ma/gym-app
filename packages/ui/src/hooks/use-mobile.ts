"use client"

import { useSyncExternalStore } from "react"

const media = "(max-width: 767px)"
function subscribe(notify: () => void) {
  const query = window.matchMedia(media)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(media).matches, () => false)
}
