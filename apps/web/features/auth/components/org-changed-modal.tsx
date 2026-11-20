"use client"

import { useEffect } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@workspace/ui/components/dialog"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { getActiveOrgId, setActiveOrgId } from "@/lib/active-org"
import { postOrgSwitch } from "@/lib/broadcast"

import { resetSignal, useOrgChangeSignal, useSwitchOrganization } from "../hooks"

// Not dismissable by design: Escape and outside clicks are prevented below. A removed membership resolves automatically to the server's fallback;
// an ordinary cross-tab switch still offers Reload or Keep working here.
export function OrgChangedModal() {
  const changed = useOrgChangeSignal()
  const { mutate } = useSwitchOrganization()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    if (!changed) return
    const priorOrgId = getActiveOrgId()
    if (!priorOrgId) return
    let active = true
    // A removed membership differs from another tab switching organizations: the old org is
    // absent from the refreshed list. This read omits x-org-id so it can resolve the fallback.
    globalThis.fetch("/api/me", { credentials: "same-origin" })
      .then(async (response) => response.ok ? response.json() as Promise<{ activeOrganization: { id: string }; organizations: { id: string }[] }> : null)
      .then((me) => {
        if (!active || !me || me.organizations.some((org) => org.id === priorOrgId)) return
        setActiveOrgId(me.activeOrganization.id)
        postOrgSwitch(me.activeOrganization.id)
        queryClient.resetQueries()
        toast({ title: t("app.removedFallback") })
        resetSignal()
      })
      .catch(() => {})
    return () => { active = false }
  }, [changed, queryClient, toast])

  if (!changed) return null

  return (
    <Dialog open={true}>
      <DialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>{t("organization.orgChanged.title")}</DialogTitle>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("organization.orgChanged.reload")}
          </Button>
          <Button onClick={() => mutate(getActiveOrgId()!, { onSuccess: resetSignal })}>
            {t("organization.orgChanged.keepWorking")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
