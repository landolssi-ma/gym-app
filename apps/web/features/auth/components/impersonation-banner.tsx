"use client"

import { stopImpersonation } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"

import { useImpersonationBanner } from "../hooks"

// At the top of every (app) page and never dismissable, so an impersonated view can never pass as
// the admin's own (for example while screen sharing). Renders nothing until the read resolves.
export function ImpersonationBanner() {
  const { data } = useImpersonationBanner()

  if (!data?.impersonating) return null

  function stop() {
    // Captured before the call; stopImpersonation() never throws.
    const impersonatedUserId = data!.user.id
    void stopImpersonation().then(() => {
      // A full navigation discards every cached query made as the impersonated user.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/admin/users/${impersonatedUserId}`)
    })
  }

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 border-b-2 border-border bg-pop px-4 py-2 text-center text-sm font-bold text-pop-foreground">
      <span>{t("auth.impersonationBanner", { email: data.user.email })}</span>
      <Button variant="outline" size="sm" onClick={stop}>
        {t("auth.impersonationBannerStop")}
      </Button>
    </div>
  )
}
