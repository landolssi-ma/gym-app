"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { changeEmail, updateName } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { meKeys, useIsImpersonating, useMe } from "@/features/auth"
import { ImageUpload } from "@/features/files"
import { errorMessage } from "@/lib/errors"

import { SettingsCard } from "../settings-card"

export function ProfileView() {
  const { data: me } = useMe()
  const impersonating = useIsImpersonating()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState(me.user.name)
  const [email, setEmail] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    const res = await updateName(name.trim())
    if (!res.ok) return toast({ title: errorMessage(undefined), variant: "destructive" })
    await queryClient.invalidateQueries({ queryKey: meKeys.all })
    toast({ title: t("settings.profile.saved") })
  }

  async function requestEmailChange(e: React.FormEvent) {
    e.preventDefault()
    const res = await changeEmail(email.trim(), "/settings/profile")
    if (!res.ok) return toast({ title: errorMessage(undefined), variant: "destructive" })
    setSentTo(email.trim())
    setEmail("")
  }

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <SettingsCard title={t("settings.profile.title")} description={t("settings.profile.subtitle")}>
        <form className="flex flex-col gap-2" onSubmit={saveName}>
          <Label htmlFor="profile-name">{t("settings.profile.nameLabel")}</Label>
          <div className="flex gap-3">
            <Input id="profile-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} disabled={impersonating} />
            <Button type="submit" disabled={impersonating || !name.trim() || name.trim() === me.user.name}>
              {t("settings.profile.save")}
            </Button>
          </div>
        </form>
      </SettingsCard>
      <SettingsCard title={t("settings.profile.avatarHeading")}>
        <ImageUpload name={me.user.name || me.user.email} image={me.user.image} disabled={impersonating} />
      </SettingsCard>
      <SettingsCard title={t("settings.profile.emailHeading")} description={t("settings.profile.emailCurrent", { email: me.user.email })}>
        <form className="flex flex-col gap-2" onSubmit={requestEmailChange}>
          <Label htmlFor="profile-email">{t("settings.profile.newEmailLabel")}</Label>
          <div className="flex gap-3">
            <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={impersonating} />
            <Button type="submit" disabled={impersonating || !email.trim()}>
              {t("settings.profile.changeEmail")}
            </Button>
          </div>
          {sentTo && <p role="status" className="text-sm text-muted-foreground">{t("settings.profile.emailSent", { email: sentTo })}</p>}
        </form>
        {impersonating && <p className="text-sm text-muted-foreground">{t("common.notAvailableWhileImpersonating")}</p>}
      </SettingsCard>
    </div>
  )
}
