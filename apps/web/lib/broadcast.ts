// Module-level singleton, not a factory called per-component: one lazily-created
// BroadcastChannel("org-sync") shared by every poster and listener in the tab.
// BroadcastChannel only excludes the exact instance that called postMessage from receiving its
// own message -- a second `new BroadcastChannel("org-sync")` in the same tab WOULD receive it,
// which is exactly the self-notification bug a sender tab must never trigger on itself.
let channel: BroadcastChannel | undefined
const switchListeners = new Set<(orgId: string) => void>()

type OrgSwitchMessage = { type: "org-switched"; orgId: string }

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel("org-sync")
    channel.onmessage = (event: MessageEvent<OrgSwitchMessage>) => {
      if (event.data?.type === "org-switched") {
        for (const listener of switchListeners) listener(event.data.orgId)
      }
    }
  }
  return channel
}

export function postOrgSwitch(orgId: string): void {
  getChannel().postMessage({ type: "org-switched", orgId } satisfies OrgSwitchMessage)
}

// Triggered only by messages from OTHER tabs -- never this tab's own postOrgSwitch.
export function onOrgSwitch(cb: (orgId: string) => void): () => void {
  getChannel()
  switchListeners.add(cb)
  return () => switchListeners.delete(cb)
}

// Same-tab-only signal for the 409 case: this tab already knows its org changed, so no
// cross-tab message is needed. Kept separate from the BroadcastChannel singleton above since
// it is same-tab-only by design.
const localListeners = new Set<() => void>()

export function notifyLocalOrgChange(): void {
  for (const listener of localListeners) listener()
}

export function onLocalOrgChange(cb: () => void): () => void {
  localListeners.add(cb)
  return () => localListeners.delete(cb)
}
