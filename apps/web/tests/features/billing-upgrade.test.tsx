// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { meKeys } from "@/features/auth"
import { UpgradeDialog } from "@/features/billing"
import { UPGRADE_REQUIRED_EVENT } from "@/lib/api-fetch"

import { mount, waitFor } from "../helpers/dom"
import { meBody } from "../helpers/me"

let m: ReturnType<typeof mount>
beforeEach(() => (m = mount()))
afterEach(() => m.unmount())
const body = () => document.body.textContent ?? ""

async function open(role: "owner" | "admin" | "member", detail: object) {
  const client = new QueryClient()
  client.setQueryData(meKeys.detail(), meBody({ orgRole: role }))
  await m.render(
    <QueryClientProvider client={client}>
      <UpgradeDialog />
    </QueryClientProvider>,
  )
  await act(async () => void window.dispatchEvent(new CustomEvent(UPGRADE_REQUIRED_EVENT, { detail })))
  await waitFor(() => body().includes("Upgrade required"))
}

describe("upgrade dialog", () => {
  it("states the reason in plain words and links owners to the plans page", async () => {
    await open("owner", { reason: "seats", used: 3, limit: 3 })
    expect(body()).toContain("Your plan's seats are all taken (3 of 3).")
    expect(document.querySelector('a[href="/plans"]')).not.toBeNull()
  })

  it("asks other roles to contact the owner, with no plans link", async () => {
    await open("member", { reason: "projects", used: 10, limit: 10 })
    expect(body()).toContain("You've reached your plan's project limit (10 of 10).")
    expect(body()).toContain("Ask the workspace owner")
    expect(document.querySelector('a[href="/plans"]')).toBeNull()
  })

  it("an unknown reason gets the generic message", async () => {
    await open("owner", { reason: "something_new" })
    expect(body()).toContain("Your plan doesn't include this.")
  })
})
