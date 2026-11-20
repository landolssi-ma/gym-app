import { expect, it, vi } from "vitest"

import { notifyLocalOrgChange, onLocalOrgChange, onOrgSwitch, postOrgSwitch } from "../../lib/broadcast"

const tick = () => new Promise((r) => setTimeout(r, 20))

it("another tab's switch reaches this tab; this tab's own switch does not", async () => {
  const heard = vi.fn()
  const off = onOrgSwitch(heard)
  postOrgSwitch("org_self")
  // A second channel stands in for another tab.
  const otherTab = new BroadcastChannel("org-sync")
  otherTab.postMessage({ type: "org-switched", orgId: "org_other" })
  await tick()
  expect(heard.mock.calls).toEqual([["org_other"]])
  off()
  otherTab.close()
})

it("the local 409 signal reaches listeners in this tab only", () => {
  const heard = vi.fn()
  const off = onLocalOrgChange(heard)
  notifyLocalOrgChange()
  off()
  notifyLocalOrgChange()
  expect(heard).toHaveBeenCalledTimes(1)
})
