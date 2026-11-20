"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { signOut } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { FeatureError } from "@/components/feature-error"
import { acceptInvitation } from "@/features/team"
import { setActiveOrgId } from "@/lib/active-org"
import { ApiError, apiFetch } from "@/lib/api-fetch"
import { postOrgSwitch } from "@/lib/broadcast"
import { apiClient } from "@/lib/hc-client"

type Outcome = "loading" | "wrong_email" | "invalid" | "full" | "error"
const card = "flex w-full flex-col gap-3 rounded-lg border-2 border-border bg-card p-6 shadow-hard-sm"

// Accepts on arrival. On success the server has made the workspace active; the invitee lands on its
// dashboard without the onboarding funnel.
export function AcceptInviteView({ token }: { token: string }) {
  const router = useRouter()
  const started = useRef(false)
  const [outcome, setOutcome] = useState<Outcome>("loading")

  const run = useCallback(async () => {
    if (started.current) return
    started.current = true
    try {
      const res = await acceptInvitation(apiClient(apiFetch), token)
      if (res.status === 403) return setOutcome("wrong_email")
      if (res.status === 404) return setOutcome("invalid")
      if (!res.ok) return setOutcome("error")
      // The route answers through its error-mapping wrapper, so its body type is not inferred.
      const { organizationId } = (await res.json()) as { organizationId: string }
      setActiveOrgId(organizationId)
      postOrgSwitch(organizationId)
      router.replace("/dashboard")
    } catch (err) {
      setOutcome(err instanceof ApiError && err.status === 402 ? "full" : "error")
    }
  }, [router, token])

  useEffect(() => {
    queueMicrotask(() => void run())
  }, [run])

  if (outcome === "loading")
    return (
      <div className={card} aria-label={t("team.accept.loading")}>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-5 w-full" />
      </div>
    )
  if (outcome === "error")
    return (
      <FeatureError
        onRetry={() => {
          started.current = false
          setOutcome("loading")
          void run()
        }}
      />
    )
  if (outcome === "wrong_email")
    return (
      <div className={card}>
        <h1 className="font-heading text-2xl font-bold">{t("team.accept.wrongEmailTitle")}</h1>
        <p className="text-muted-foreground">{t("team.accept.wrongEmailBody")}</p>
        <Button
          variant="secondary"
          className="w-fit"
          onClick={async () => {
            await signOut()
            router.replace(`/sign-in?next=${encodeURIComponent(`/team/accept/${token}`)}`)
          }}
        >
          {t("team.accept.wrongEmailCta")}
        </Button>
      </div>
    )
  return (
    <div className={card}>
      <h1 className="font-heading text-2xl font-bold">{t("team.accept.invalidTitle")}</h1>
      <p className="text-muted-foreground">{t(outcome === "full" ? "team.accept.fullBody" : "team.accept.invalidBody")}</p>
    </div>
  )
}
