"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { messages, t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@workspace/ui/components/dialog"

import { meKeys, type Me } from "@/features/auth"
import { UPGRADE_REQUIRED_EVENT, type UpgradeRequired } from "@/lib/api-fetch"

type Reason = keyof typeof messages.upgrade.reasons

// Mounted once in the (app) layout: every 402 upgrade_required, from any feature, opens it.
export function UpgradeDialog() {
  const [refusal, setRefusal] = useState<UpgradeRequired | null>(null)
  // Reads the role from the seeded /api/me cache without suspending the layout.
  const { data: me } = useQuery<Me>({ queryKey: meKeys.detail(), enabled: false })

  useEffect(() => {
    const open = (e: Event) => setRefusal((e as CustomEvent<UpgradeRequired>).detail)
    window.addEventListener(UPGRADE_REQUIRED_EVENT, open)
    return () => window.removeEventListener(UPGRADE_REQUIRED_EVENT, open)
  }, [])

  if (!refusal) return null
  const owner = me?.orgRole === "owner"
  const message = refusal.reason in messages.upgrade.reasons ? t(`upgrade.reasons.${refusal.reason as Reason}`, { used: refusal.used ?? 0, limit: refusal.limit ?? 0 }) : t("upgrade.generic")
  return (
    <Dialog open onOpenChange={(open) => !open && setRefusal(null)}>
      <DialogContent>
        <DialogTitle>{t("upgrade.title")}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
        {!owner && <p className="text-sm text-muted-foreground">{t("upgrade.askOwner")}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setRefusal(null)}>
            {t("upgrade.close")}
          </Button>
          {owner && (
            <Button asChild>
              <a href="/plans">{t("upgrade.ownerCta")}</a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
