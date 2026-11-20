import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"

// Small happy-dom helpers for component tests: mount, find by text, click, type.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

export function mount() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  return {
    container,
    render: (node: ReactNode) => act(async () => root.render(node)),
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

export const byText = (text: string | RegExp, selector = "button, [role=radio], [role=tab], a, label", scope: Element | Document = document) =>
  [...scope.querySelectorAll<HTMLElement>(selector)].find((el) =>
    typeof text === "string" ? el.textContent?.trim() === text || el.textContent?.includes(text) : text.test(el.textContent ?? "")
  )

export const click = (el: Element | null | undefined) =>
  act(async () => {
    if (!el) throw new Error("element not found")
    ;(el as HTMLElement).click()
  })

// React tracks input values through the native setter; a plain assignment would not fire onChange.
export const type = (el: Element | null | undefined, value: string) =>
  act(async () => {
    if (!el) throw new Error("input not found")
    const input = el as HTMLInputElement | HTMLTextAreaElement
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })

export const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)))

// Flushes until `check` passes (or gives up after ~1 s), for suspense and query resolution.
export async function waitFor(check: () => boolean) {
  for (let i = 0; i < 50 && !check(); i++) await act(async () => new Promise((r) => setTimeout(r, 20)))
  if (!check()) throw new Error("waitFor: condition never became true")
}
