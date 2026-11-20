"use client"

import { useState } from "react"

import { INTERVALS, PLAN_IDS, PLANS, type Interval, type PlanId } from "@workspace/billing"
import { t } from "@workspace/i18n"
import { Alert } from "@workspace/ui/components/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { WorkspaceHeading } from "@/components/shell/workspace-heading"
import { useIsImpersonating, useMe } from "@/features/auth"
import { useBilling, useBillingActions, type BillingData } from "@/features/billing"
import { setActiveOrgId } from "@/lib/active-org"
import { ApiError, apiFetch } from "@/lib/api-fetch"
import { postOrgSwitch } from "@/lib/broadcast"
import { errorMessage } from "@/lib/errors"
import { apiClient } from "@/lib/hc-client"

const card = "rounded-panel border-border-strong shadow-hard-sm"
const heading = "font-heading text-2xl font-bold tracking-tight"
const formatDate = (iso: unknown) => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso as string))
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
type Sub = NonNullable<BillingData["subscription"]>

function dateLine(sub: Sub) {
  const end = sub.trialEndsAt ?? sub.currentPeriodEnd
  if (sub.cancelAtPeriodEnd) return t("billing.ends", { date: formatDate(end) })
  if (sub.status === "trialing") return t("billing.trialEnds", { date: formatDate(end) })
  if (sub.status === "active") return t("billing.renews", { date: formatDate(sub.currentPeriodEnd) })
  return t("billing.periodEnd", { date: formatDate(sub.currentPeriodEnd) })
}

export function BillingDashboard() {
  const { data } = useBilling()
  const { data: me } = useMe()
  const impersonating = useIsImpersonating()
  const actions = useBillingActions()
  const { toast } = useToast()
  const isOwner = me.orgRole === "owner"
  const sub = data.subscription
  const failed = (err: unknown) => toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" })

  async function openPortal() {
    try {
      window.location.assign((await actions.portal.mutateAsync()).url)
    } catch (err) {
      failed(err)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <WorkspaceHeading title={t("billing.planHeading")} />
      {!sub ? (
        <Card className={card}>
          <CardHeader>
            <h2 className={heading}>{t("billing.noSubscription")}</h2>
          </CardHeader>
          {isOwner && (
            <CardFooter>
              <Button asChild>
                <a href="/plans">{t("billing.goToPlans")}</a>
              </Button>
            </CardFooter>
          )}
        </Card>
      ) : (
        <Card className={card}>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-baseline gap-4">
                <h2 className="rounded-sm border border-border-strong bg-butter px-2 py-1 font-mono text-xs font-semibold uppercase">{PLANS[sub.plan as PlanId].name}</h2>
                <p className="font-heading text-3xl font-bold tabular-nums">
                  {usd(PLANS[sub.plan as PlanId].priceUsd[sub.interval])}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">{t(`billing.perInterval.${sub.interval}`)}</span>
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-forest bg-sky/40 px-3 py-1 font-mono text-xs font-medium">{t(`billing.status.${sub.status}`)}</span>
            </div>
            <CardDescription>{dateLine(sub)}</CardDescription>
            {sub.pendingPlan && <CardDescription>{t("billing.pendingPlan", { plan: PLANS[sub.pendingPlan as PlanId].name })}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {sub.status === "past_due" && (
              <Alert variant="destructive">
                <div className="flex flex-col gap-2">
                  <p>{t("billing.pastDue")}</p>
                  {isOwner && sub.hasPortal && (
                    <Button size="sm" className="self-start" disabled={impersonating || actions.portal.isPending} onClick={openPortal}>
                      {t("billing.portal")}
                    </Button>
                  )}
                </div>
              </Alert>
            )}
            {sub.cancelAtPeriodEnd && (
              <Alert>
                <div className="flex flex-col gap-2">
                  <p>{t("billing.scheduledCancel", { date: formatDate(sub.trialEndsAt ?? sub.currentPeriodEnd) })}</p>
                  {isOwner && (
                    <Button size="sm" className="self-start" disabled={impersonating || actions.resume.isPending} onClick={() => actions.resume.mutateAsync().then(() => toast({ title: t("billing.resumed") }), failed)}>
                      {t("billing.resume")}
                    </Button>
                  )}
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={card}>
        <CardHeader>
          <h2 className={heading}>{t("billing.usageHeading")}</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(data.limits).map(([name, { used, limit }]) => (
            <div key={name} className="flex items-center justify-between gap-4 font-mono text-sm">
              <span>{name in { seats: 1, projects: 1 } ? t(`billing.limits.${name as "seats" | "projects"}`) : name}</span>
              <span>{limit === null ? t("billing.usageUnlimited", { used }) : t("billing.usageCount", { used, limit })}</span>
            </div>
          ))}
          {Object.entries(data.meters as Record<string, { used: number; limit: number }>).map(([name, { used, limit }]) => (
            <div key={name} className="flex items-center justify-between gap-4 font-mono text-sm">
              <span>{name}</span>
              <span>{t("billing.usageCount", { used, limit })}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {sub && sub.status !== "canceled" && sub.status !== "ended" && (
        <Card className={card}>
          <CardHeader>
            <h2 className={heading}>{t("billing.manageHeading")}</h2>
            {!isOwner && <CardDescription>{t("billing.readOnly")}</CardDescription>}
            {isOwner && impersonating && <CardDescription>{t("common.notAvailableWhileImpersonating")}</CardDescription>}
          </CardHeader>
          {isOwner && (
            <CardFooter className="flex-wrap gap-3">
              <ChangePlanDialog sub={sub} disabled={impersonating} />
              {sub.hasPortal && (
                <Button variant="secondary" disabled={impersonating || actions.portal.isPending} onClick={openPortal}>
                  {t("billing.portal")}
                </Button>
              )}
              {!sub.cancelAtPeriodEnd && <CancelDialog date={sub.trialEndsAt ?? sub.currentPeriodEnd} disabled={impersonating} />}
            </CardFooter>
          )}
        </Card>
      )}

      <Card className={card}>
        <CardHeader>
          <h2 className={heading}>{t("billing.dangerHeading")}</h2>
          <CardDescription>{t("billing.dangerBody")}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-wrap gap-3">
          {isOwner && <DeleteWorkspaceDialog name={me.activeOrganization.name} disabled={impersonating} />}
          <ConfirmDeleteDialog
            trigger={t("billing.deleteAccount")}
            title={t("billing.deleteAccount")}
            body={t("billing.deleteAccountBody")}
            confirmLabel={t("billing.deleteAccountConfirm", { value: me.user.email })}
            value={me.user.email}
            disabled={impersonating}
            onConfirm={async (confirm) => {
              const res = await apiClient(apiFetch).api.account.delete.$post({ json: { confirm } })
              if (!res.ok) throw new ApiError(res.status, ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "unknown")
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.assign("/sign-in")
            }}
          />
        </CardFooter>
      </Card>
    </div>
  )
}

// Also used on the workspace settings page.
export function DeleteWorkspaceDialog({ name, disabled }: { name: string; disabled?: boolean }) {
  return (
    <ConfirmDeleteDialog
      trigger={t("billing.deleteWorkspace")}
      title={t("billing.deleteWorkspace")}
      body={t("billing.deleteWorkspaceBody", { name })}
      confirmLabel={t("billing.deleteWorkspaceConfirm", { value: name })}
      value={name}
      disabled={disabled}
      onConfirm={async (confirm) => {
        const res = await apiClient(apiFetch).api.organizations.current.delete.$post({ json: { confirm } })
        if (!res.ok) throw new ApiError(res.status, ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "unknown")
        const { activeId } = (await res.json()) as { activeId: string | null }
        if (activeId) {
          setActiveOrgId(activeId)
          postOrgSwitch(activeId)
        }
        // A full navigation: every cached query belonged to the deleted workspace.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/dashboard")
      }}
    />
  )
}

function ChangePlanDialog({ sub, disabled }: { sub: Sub; disabled: boolean }) {
  const { preview, change } = useBillingActions()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<PlanId>(sub.plan as PlanId)
  const [interval, setInterval] = useState<Interval>(sub.interval)
  const same = plan === sub.plan && interval === sub.interval
  const refusal = preview.error instanceof ApiError ? preview.error : null

  const pick = (p: PlanId, i: Interval) => {
    setPlan(p)
    setInterval(i)
    if (p !== sub.plan || i !== sub.interval) preview.mutate({ plan: p, interval: i })
    else preview.reset()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" disabled={disabled}>
          {t("billing.changePlan")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("billing.changeTitle")}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="change-plan">{t("billing.planLabel")}</Label>
            <NativeSelect id="change-plan" value={plan} onChange={(e) => pick(e.target.value as PlanId, interval)}>
              {PLAN_IDS.map((p) => (
                <NativeSelectOption key={p} value={p}>
                  {PLANS[p].name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="change-interval">{t("billing.intervalLabel")}</Label>
            <NativeSelect id="change-interval" value={interval} onChange={(e) => pick(plan, e.target.value as Interval)}>
              {INTERVALS.map((i) => (
                <NativeSelectOption key={i} value={i}>
                  {t(`billing.intervals.${i}`)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
        <AlertDialogDescription>
          {same
            ? ""
            : refusal
              ? errorMessage(refusal.message)
              : preview.data?.chargeUsd
                ? t("billing.previewCharge", { amount: usd(preview.data.chargeUsd) })
                : preview.isSuccess
                  ? t("billing.previewRenewal")
                  : t("billing.previewUnknown")}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("billing.keep")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={same || !!refusal || preview.isPending || change.isPending}
            onClick={(e) => {
              e.preventDefault()
              change.mutateAsync({ plan, interval }).then(
                () => {
                  setOpen(false)
                  toast({ title: t("billing.changed") })
                },
                (err) => toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" }),
              )
            }}
          >
            {t("billing.confirmChange")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CancelDialog({ date, disabled }: { date: unknown; disabled: boolean }) {
  const { cancel } = useBillingActions()
  const { toast } = useToast()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {t("billing.cancel")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("billing.cancelTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("billing.cancelBody", { date: formatDate(date) })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("billing.keep")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => cancel.mutateAsync().then(() => toast({ title: t("billing.canceled") }), (err) => toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" }))}
          >
            {t("billing.confirmCancel")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
