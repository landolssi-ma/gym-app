"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { meKeys, useIsImpersonating, useMe } from "@/features/auth"
import { ImageUpload } from "@/features/files"
import { apiFetch } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"
import { apiClient } from "@/lib/hc-client"

import { DeleteWorkspaceDialog } from "../../billing/billing-dashboard"
import { SettingsCard } from "../settings-card"

// Owner and admins edit; members see the same settings read-only. Only the owner deletes.
export function WorkspaceView() {
  const { data: me } = useMe()
  const impersonating = useIsImpersonating()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const canEdit = me.orgRole === "owner" || me.orgRole === "admin"
  const [name, setName] = useState(me.activeOrganization.name)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const res = await apiClient(apiFetch).api.organizations.current.$patch({ json: { name: name.trim() } })
    if (!res.ok) return toast({ title: errorMessage(undefined), variant: "destructive" })
    await queryClient.invalidateQueries({ queryKey: meKeys.all })
    toast({ title: t("settings.workspace.saved") })
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <SettingsCard title={t("settings.workspace.title")} description={canEdit ? t("settings.workspace.subtitle") : t("settings.workspace.readOnly")}>
        {canEdit ? (
          <form className="flex flex-col gap-2" onSubmit={save}>
            <Label htmlFor="workspace-name-setting">{t("settings.workspace.nameLabel")}</Label>
            <div className="flex gap-3">
              <Input id="workspace-name-setting" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} disabled={impersonating} />
              <Button type="submit" disabled={impersonating || !name.trim() || name.trim() === me.activeOrganization.name}>
                {t("settings.workspace.save")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="font-heading text-lg font-bold">{me.activeOrganization.name}</p>
        )}
      </SettingsCard>
      <SettingsCard title={t("settings.workspace.logoHeading")}>
        <ImageUpload purpose="logo" name={me.activeOrganization.name} image={me.activeOrganization.logo} disabled={!canEdit || impersonating} />
      </SettingsCard>
      {me.orgRole === "owner" && (
        <SettingsCard title={t("settings.workspace.dangerHeading")} description={t("settings.workspace.dangerBody")}>
          <div>
            <DeleteWorkspaceDialog name={me.activeOrganization.name} disabled={impersonating} />
          </div>
        </SettingsCard>
      )}
    </div>
  )
}
