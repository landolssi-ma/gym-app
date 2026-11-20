// @vitest-environment happy-dom
import { useState } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { FeatureBoundary } from "../../components/feature-error"
import { click, mount, waitFor } from "../helpers/dom"

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => m.unmount())

let fail = true
function Flaky() {
  const [n] = useState(0)
  if (fail) throw new Error("db password hunter2")
  return <p>loaded {n}</p>
}

it("a failing feature shows a generic message, never the error, and Retry renders it again", async () => {
  await m.render(
    <FeatureBoundary skeleton="loading">
      <Flaky />
    </FeatureBoundary>,
  )
  await waitFor(() => m.container.textContent?.includes("Retry") ?? false)
  expect(m.container.textContent).toContain("Something went wrong")
  expect(m.container.textContent).not.toContain("hunter2")
  fail = false
  await click([...m.container.querySelectorAll("button")].find((b) => b.textContent === "Retry"))
  await waitFor(() => m.container.textContent?.includes("loaded") ?? false)
})
