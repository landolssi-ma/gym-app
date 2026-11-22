"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { changeEmail, updateName } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { useToast } from "@workspace/ui/hooks/use-toast"

import { meKeys, useIsImpersonating, useMe } from "@/features/auth"
import { ImageUpload } from "@/features/files"
import { errorMessage } from "@/lib/errors"
import { apiFetch } from "@/lib/api-fetch"

import { SettingsCard } from "../settings-card"

function GymProfileSettings({ disabled }: { disabled: boolean }) {
  const { toast } = useToast()
  const [loaded, setLoaded] = useState(false)
  const [values, setValues] = useState({
    sex: "",
    age: "",
    heightCm: "",
    weightKg: "",
    waistCm: "",
    hipCm: "",
    sportLevel: "",
    goal: "",
    sessionsPerWeek: "",
  })

  useEffect(() => {
    let active = true
    void apiFetch("/api/gym-profile").then(async (res) => {
      if (!res.ok) return
      const data = await res.json() as { profile?: Record<string, unknown> | null }
      if (!active || !data.profile) {
        if (active) setLoaded(true)
        return
      }
      const p = data.profile
      setValues({
        sex: String(p.sex ?? ""),
        age: String(p.age ?? ""),
        heightCm: String(p.heightCm ?? ""),
        weightKg: String(p.weightKg ?? ""),
        waistCm: String(p.waistCm ?? ""),
        hipCm: p.hipCm == null ? "" : String(p.hipCm),
        sportLevel: String(p.sportLevel ?? ""),
        goal: String(p.goal ?? ""),
        sessionsPerWeek: String(p.sessionsPerWeek ?? ""),
      })
      setLoaded(true)
    })
    return () => { active = false }
  }, [])

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const res = await apiFetch("/api/gym-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sex: values.sex,
        age: Number(values.age),
        heightCm: Number(values.heightCm),
        weightKg: Number(values.weightKg),
        waistCm: Number(values.waistCm),
        ...(values.hipCm ? { hipCm: Number(values.hipCm) } : {}),
        sportLevel: values.sportLevel,
        goal: values.goal,
        sessionsPerWeek: Number(values.sessionsPerWeek),
      }),
    })
    if (!res.ok) return toast({ title: errorMessage(undefined), variant: "destructive" })
    toast({ title: t("gymProfile.saved") })
  }

  if (!loaded) return null
  return (
    <SettingsCard title={t("gymProfile.title")} description={t("gymProfile.subtitle")}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
        <GymSelect id="settings-sex" label={t("gymProfile.sex")} value={values.sex} onChange={(v) => set("sex", v)} options={[["female", t("gymProfile.sexFemale")], ["male", t("gymProfile.sexMale")], ["other", t("gymProfile.sexOther")]]} />
        <GymInput id="settings-age" label={t("gymProfile.age")} value={values.age} onChange={(v) => set("age", v)} min={13} max={120} />
        <GymInput id="settings-height" label={t("gymProfile.height")} value={values.heightCm} onChange={(v) => set("heightCm", v)} min={80} max={250} />
        <GymInput id="settings-weight" label={t("gymProfile.weight")} value={values.weightKg} onChange={(v) => set("weightKg", v)} min={20} max={500} step="0.1" />
        <GymInput id="settings-waist" label={t("gymProfile.waist")} value={values.waistCm} onChange={(v) => set("waistCm", v)} min={40} max={300} step="0.1" />
        <GymInput id="settings-hip" label={t("gymProfile.hip")} value={values.hipCm} onChange={(v) => set("hipCm", v)} min={40} max={300} step="0.1" optional />
        <GymSelect id="settings-level" label={t("gymProfile.level")} value={values.sportLevel} onChange={(v) => set("sportLevel", v)} options={[["beginner", t("gymProfile.levelBeginner")], ["intermediate", t("gymProfile.levelIntermediate")], ["advanced", t("gymProfile.levelAdvanced")]]} />
        <GymSelect id="settings-sessions" label={t("gymProfile.sessions")} value={values.sessionsPerWeek} onChange={(v) => set("sessionsPerWeek", v)} options={[1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), String(n)])} />
        <GymSelect id="settings-goal" label={t("gymProfile.goal")} value={values.goal} onChange={(v) => set("goal", v)} options={[["muscle_gain", t("gymProfile.goalMuscleGain")], ["fat_loss", t("gymProfile.goalFatLoss")], ["weight_loss", t("gymProfile.goalWeightLoss")], ["maintenance", t("gymProfile.goalMaintenance")], ["body_recomposition", t("gymProfile.goalRecomposition")]]} />
        <Button type="submit" className="self-end" disabled={disabled}>{t("settings.profile.save")}</Button>
      </form>
    </SettingsCard>
  )
}

function GymInput({ id, label, value, onChange, min, max, step = "1", optional = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; min: number; max: number; step?: string; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}{optional && ` (${t("gymProfile.optional")})`}</Label>
      <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} step={step} required={!optional} />
    </div>
  )
}

function GymSelect({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (value: string) => void; options: (readonly [string, string])[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-md border border-input bg-card px-4 text-base">
        <option value="">—</option>
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
  )
}

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
      <GymProfileSettings disabled={impersonating} />
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
