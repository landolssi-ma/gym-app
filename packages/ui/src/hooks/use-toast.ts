"use client"

export type ToastInput = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export type QueuedToast = ToastInput & { id: number }

const listeners = new Set<() => void>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const EMPTY: QueuedToast[] = []
let queue: QueuedToast[] = EMPTY
let nextId = 0

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts() {
  return queue
}

export function getServerToasts() {
  return EMPTY
}

export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  const next = queue.filter((item) => item.id !== id)
  if (next.length === queue.length) return
  queue = next
  notify()
}

export function toast(input: ToastInput) {
  const id = ++nextId
  queue = [...queue, { ...input, id }]
  notify()
  timers.set(id, setTimeout(() => dismissToast(id), 4000))
  return id
}

export function useToast() {
  return { toast }
}
