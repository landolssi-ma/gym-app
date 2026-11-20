"use client"

import { useState } from "react"

import { t } from "@workspace/i18n"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { Avatar } from "@/components/shell/avatar"
import { displayName } from "@/components/shell/user-identity"
import { WorkspaceHeading } from "@/components/shell/workspace-heading"
import { useIsImpersonating, useMe } from "@/features/auth"
import { useTeam, useTeamActions } from "@/features/team"
import { ApiError } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"

type Action = { kind: "remove" | "leave" | "transfer"; id?: string; name: string }
const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" })
const section = "rounded-panel border border-border-strong bg-card p-5 shadow-hard-sm"
const sectionTitle = "font-mono text-xs font-bold text-muted-foreground uppercase"

// Controls follow the viewer's role; the API refuses the same actions regardless.
export function TeamView() {
  const { data } = useTeam()
  const { data: me } = useMe()
  const impersonating = useIsImpersonating()
  const actions = useTeamActions()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const isOwner = data.role === "owner"
  const canManage = data.role === "owner" || data.role === "admin"
  const { used, limit } = data.seats

  // A 402 opens the upgrade dialog through apiFetch; other refusals show their message here.
  const failed = (err: unknown) => {
    if (err instanceof ApiError && err.status === 402) return
    toast({ title: errorMessage(err instanceof ApiError ? err.message : undefined), variant: "destructive" })
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await actions.invite.mutateAsync({ email: email.trim(), role })
      setEmail("")
      toast({ title: t("team.inviteSent") })
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 402)) setError(errorMessage(err instanceof ApiError ? err.message : undefined))
    }
  }

  async function confirmAction() {
    if (!action) return
    try {
      if (action.kind === "remove") await actions.remove.mutateAsync(action.id!)
      if (action.kind === "transfer") await actions.transfer.mutateAsync(action.id!)
      if (action.kind === "leave") await actions.leave.mutateAsync()
      toast({ title: t(action.kind === "transfer" ? "team.transferDone" : action.kind === "leave" ? "team.leftDone" : "team.removedDone") })
    } catch (err) {
      failed(err)
    } finally {
      setAction(null)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <WorkspaceHeading title={t("team.title")} className="lg:col-span-3" />
      <div className="flex flex-col gap-5 lg:col-span-2">
        <section className={section}>
          <p className={sectionTitle}>{t("team.workspaceLabel")}</p>
          <div className="flex items-center justify-between gap-4">
            <p className="font-heading text-lg font-bold">{me.activeOrganization.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{limit === null ? t("team.seatsUnlimited", { used }) : t("team.seatsUsed", { used, limit })}</p>
          </div>
        </section>

        <section className={section}>
          <h2 className={sectionTitle}>{t("team.membersHeading")}</h2>
          {impersonating && <p className="mt-1 text-sm text-muted-foreground">{t("common.notAvailableWhileImpersonating")}</p>}
          <ul className="mt-2 flex flex-col gap-2">
            {data.members.map((member) => {
              const self = member.userId === me.user.id
              const name = displayName(member.name, member.email)
              const editable = canManage && !self && member.role !== "owner"
              return (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-border p-3 text-sm">
                  <span className="flex items-center gap-3">
                    <Avatar name={name} image={member.image} className="size-8 text-xs" />
                    <span className="flex flex-col">
                      <strong>{name}</strong>
                      <span>{member.email}</span>
                      <span className="text-xs text-muted-foreground">{t("team.joinedLabel", { date: dateFmt.format(new Date(member.createdAt)) })}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    {editable ? (
                      <NativeSelect
                        aria-label={t("team.roleLabel", { name })}
                        value={member.role}
                        disabled={impersonating || actions.setRole.isPending}
                        onChange={(e) => actions.setRole.mutateAsync({ id: member.id, role: e.target.value as "admin" | "member" }).then(() => toast({ title: t("team.roleChanged") }), failed)}
                      >
                        <NativeSelectOption value="admin">{t("team.roles.admin")}</NativeSelectOption>
                        <NativeSelectOption value="member">{t("team.roles.member")}</NativeSelectOption>
                      </NativeSelect>
                    ) : (
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>{t(`team.roles.${member.role as "owner" | "admin" | "member"}`)}</Badge>
                    )}
                    {self && <Badge variant="secondary">{t("team.youBadge")}</Badge>}
                    {isOwner && !self && (
                      <Button variant="outline" size="sm" disabled={impersonating} onClick={() => setAction({ kind: "transfer", id: member.id, name })}>
                        {t("team.makeOwner")}
                      </Button>
                    )}
                    {editable && (
                      <Button variant="outline" size="sm" disabled={impersonating} onClick={() => setAction({ kind: "remove", id: member.id, name })}>
                        {t("team.remove")}
                      </Button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {!isOwner && (
            <Button className="mt-4" variant="outline" disabled={impersonating} onClick={() => setAction({ kind: "leave", name: me.activeOrganization.name })}>
              {t("team.leave")}
            </Button>
          )}
        </section>

        <section className={section}>
          <h2 className={sectionTitle}>{t("team.pendingHeading")}</h2>
          {data.invitations.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("team.pendingEmpty")}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {data.invitations.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-4 rounded-md border-2 border-border p-3 text-sm">
                  <span className="flex flex-col">
                    <span>
                      {invite.email} · {t(`team.roles.${invite.role === "admin" ? "admin" : "member"}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">{t("team.expiresLabel", { date: dateFmt.format(new Date(invite.expiresAt)) })}</span>
                  </span>
                  {canManage && (
                    <Button variant="outline" size="sm" disabled={actions.revoke.isPending || impersonating} onClick={() => actions.revoke.mutateAsync(invite.id).then(() => toast({ title: t("team.inviteRevoked") }), failed)}>
                      {t("team.revoke")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-5">
        {canManage && (
          <section className={section}>
            <h2 className={sectionTitle}>{t("team.inviteHeading")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("team.inviteBody")}</p>
            <form className="mt-4 flex flex-col items-stretch gap-3" onSubmit={sendInvite}>
              <Label htmlFor="invite-email">{t("team.inviteEmailLabel")}</Label>
              <Input id="invite-email" type="email" placeholder={t("team.inviteEmailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} disabled={actions.invite.isPending || impersonating} />
              <Label htmlFor="invite-role">{t("team.inviteRoleLabel")}</Label>
              <NativeSelect id="invite-role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")} disabled={impersonating}>
                <NativeSelectOption value="member">{t("team.roles.member")}</NativeSelectOption>
                <NativeSelectOption value="admin">{t("team.roles.admin")}</NativeSelectOption>
              </NativeSelect>
              <Button type="submit" disabled={actions.invite.isPending || impersonating || !email.trim()}>
                {actions.invite.isPending ? t("team.inviteSending") : t("team.inviteSubmit")}
              </Button>
            </form>
            {impersonating && <p className="mt-2 text-sm text-muted-foreground">{t("common.notAvailableWhileImpersonating")}</p>}
            {error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>
        )}
        <section className={section}>
          <h2 className={sectionTitle}>{t("team.rolesHeading")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("team.rolesOwner")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("team.rolesAdmin")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("team.rolesMember")}</p>
        </section>
      </div>

      <AlertDialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action?.kind === "transfer" ? t("team.transferTitle", { name: action.name }) : action?.kind === "leave" ? t("team.leaveTitle") : t("team.removeTitle", { name: action?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t(action?.kind === "transfer" ? "team.transferBody" : action?.kind === "leave" ? "team.leaveBody" : "team.removeBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("team.cancelAction")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>{t("team.confirmAction")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
