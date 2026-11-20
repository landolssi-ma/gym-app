"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { changePassword, requestPasswordReset } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { useIsImpersonating, useMe } from "@/features/auth"
import { apiFetch } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"
import { apiClient } from "@/lib/hc-client"

import { SettingsCard } from "../settings-card"

const sessionsKey = ["account", "sessions"] as const
const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })

export function SecurityView() {
  const { data: me } = useMe()
  const impersonating = useIsImpersonating()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [linkSent, setLinkSent] = useState(false)
  const sessions = useQuery({
    queryKey: sessionsKey,
    queryFn: async () => (await apiClient(apiFetch).api.account.sessions.$get()).json(),
  })
  const revoke = useMutation({
    mutationFn: (id: string) => apiClient(apiFetch).api.account.sessions[":id"].$delete({ param: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionsKey })
      toast({ title: t("settings.security.revoked") })
    },
  })

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    const res = await changePassword(current, next)
    if (!res.ok) return toast({ title: res.code === "INVALID_PASSWORD" ? errorMessage("wrong_password") : res.code === "PASSWORD_COMPROMISED" ? t("auth.passwordBreached") : errorMessage(undefined), variant: "destructive" })
    setCurrent("")
    setNext("")
    toast({ title: t("settings.security.passwordChanged") })
  }

  // Better Auth's own route: it ends every session, this one included, then this browser goes to sign-in.
  async function signOutEverywhere() {
    await globalThis.fetch("/api/auth/revoke-sessions", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/sign-in")
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <SettingsCard title={t("settings.security.passwordHeading")} description={me.hasPassword ? undefined : t("settings.security.noPassword")}>
        {me.hasPassword ? (
          <form className="flex flex-col gap-3" onSubmit={submitPassword}>
            <Label htmlFor="current-password">{t("settings.security.currentPassword")}</Label>
            <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={impersonating} />
            <Label htmlFor="new-password">{t("settings.security.newPassword")}</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={impersonating} />
            <p className="text-sm text-muted-foreground">{t("auth.passwordHint")}</p>
            <Button type="submit" className="self-start" disabled={impersonating || !current || next.length < 8}>
              {t("settings.security.changePassword")}
            </Button>
          </form>
        ) : linkSent ? (
          <p role="status" className="text-sm">{t("settings.security.setPasswordSent", { email: me.user.email })}</p>
        ) : (
          <Button className="self-start" disabled={impersonating} onClick={() => requestPasswordReset(me.user.email, "/reset-password").then(() => setLinkSent(true))}>
            {t("settings.security.setPassword")}
          </Button>
        )}
      </SettingsCard>
      <SettingsCard title={t("settings.security.sessionsHeading")}>
        <ul className="flex flex-col gap-2">
          {sessions.data?.sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-border p-3 text-sm">
              <span className="flex flex-col">
                <strong>
                  {s.userAgent || t("settings.security.unknownDevice")}
                  {s.country ? ` · ${s.country}` : ""}
                </strong>
                <span className="text-xs text-muted-foreground">{t("settings.security.lastActive", { date: dateFmt.format(new Date(s.lastActiveAt as unknown as string)) })}</span>
              </span>
              {s.current ? (
                <Badge variant="secondary">{t("settings.security.currentDevice")}</Badge>
              ) : (
                <Button variant="outline" size="sm" disabled={impersonating || revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                  {t("settings.security.revoke")}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{t("settings.security.signOutEverywhereBody")}</p>
        <Button variant="destructive" className="self-start" disabled={impersonating} onClick={signOutEverywhere}>
          {t("settings.security.signOutEverywhere")}
        </Button>
        {impersonating && <p className="text-sm text-muted-foreground">{t("common.notAvailableWhileImpersonating")}</p>}
      </SettingsCard>
    </div>
  )
}
