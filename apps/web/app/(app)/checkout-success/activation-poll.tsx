"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Spinner } from "@workspace/ui/components/spinner"

import { site } from "@/config/site"
import { apiFetch } from "@/lib/api-fetch"
import { apiClient } from "@/lib/hc-client"

export const POLL_MS = 1500
// About 30 seconds, then the delay message.
export const MAX_ATTEMPTS = 20

// The webhook, not this page, activates the subscription: wait for it, then go to the dashboard.
export function ActivationPoll() {
  const router = useRouter()
  const [delayed, setDelayed] = useState(false)

  const poll = useCallback(async () => {
    setDelayed(false)
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const res = await apiClient(apiFetch).api.me.$get().catch(() => null)
      if (res?.ok && (await res.json()).live) return router.replace("/dashboard")
      await new Promise((r) => setTimeout(r, POLL_MS))
    }
    setDelayed(true)
  }, [router])

  useEffect(() => {
    queueMicrotask(() => void poll())
  }, [poll])

  return (
    <Card className="w-full gap-4 p-6 text-center shadow-none">
      <h1 className="font-heading text-2xl font-bold">{t("checkout.title")}</h1>
      {delayed ? (
        <>
          <p className="text-muted-foreground">{t("checkout.delayed", { supportEmail: site.supportEmail })}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => void poll()}>{t("checkout.retry")}</Button>
            <Button variant="outline" asChild>
              <a href="/plans">{t("checkout.backToPlans")}</a>
            </Button>
          </div>
        </>
      ) : (
        <p className="flex items-center justify-center gap-2 text-muted-foreground">
          <Spinner />
          {t("checkout.waiting")}
        </p>
      )}
    </Card>
  )
}
