"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { ChoiceGroup } from "@/components/choice-group"
import { meKeys } from "@/features/auth"
import { ApiError, apiFetch } from "@/lib/api-fetch"

type Sex = "" | "female" | "male" | "other"
type Level = "" | "beginner" | "intermediate" | "advanced"
type Goal = "" | "muscle_gain" | "fat_loss" | "weight_loss" | "maintenance" | "body_recomposition"

export function GymProfileForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sex, setSex] = useState<Sex>("")
  const [age, setAge] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [waistCm, setWaistCm] = useState("")
  const [hipCm, setHipCm] = useState("")
  const [sportLevel, setSportLevel] = useState<Level>("")
  const [goal, setGoal] = useState<Goal>("")
  const [sessions, setSessions] = useState("")
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/gym-profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sex,
          age: Number(age),
          heightCm: Number(heightCm),
          weightKg: Number(weightKg),
          waistCm: Number(waistCm),
          ...(hipCm ? { hipCm: Number(hipCm) } : {}),
          sportLevel,
          goal,
          sessionsPerWeek: Number(sessions),
        }),
      })
      if (!res.ok) throw new ApiError(res.status, ((await res.json()) as { error?: string }).error ?? "invalid")
    },
  })

  const complete = !!sex && !!sportLevel && !!goal && !!age && !!heightCm && !!weightKg && !!waistCm && !!sessions

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await save.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: meKeys.all })
      router.replace("/post-sign-in")
    } catch (err) {
      setError(err instanceof ApiError ? t("errors.invalid") : t("errors.generic"))
    }
  }

  return (
    <Card className="gap-6 rounded-panel border-border-strong bg-card p-5 shadow-hard-sm sm:p-8">
      <div>
        <p className="font-mono text-caption font-bold uppercase tracking-widest text-sage">{t("gymProfile.eyebrow")}</p>
        <h1 className="mt-2 font-heading text-section font-bold tracking-tight text-charcoal">{t("gymProfile.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("gymProfile.subtitle")}</p>
      </div>
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <ChoiceGroup label={t("gymProfile.sex")} value={sex || null} options={[
          { value: "female", label: t("gymProfile.sexFemale") },
          { value: "male", label: t("gymProfile.sexMale") },
          { value: "other", label: t("gymProfile.sexOther") },
        ]} onChange={(value) => setSex((value ?? "") as Sex)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="age" label={t("gymProfile.age")} value={age} onChange={setAge} min={13} max={120} />
          <NumberField id="height" label={t("gymProfile.height")} value={heightCm} onChange={setHeightCm} min={80} max={250} />
          <NumberField id="weight" label={t("gymProfile.weight")} value={weightKg} onChange={setWeightKg} min={20} max={500} step="0.1" />
          <NumberField id="waist" label={t("gymProfile.waist")} value={waistCm} onChange={setWaistCm} min={40} max={300} step="0.1" />
          <NumberField id="hip" label={t("gymProfile.hip")} value={hipCm} onChange={setHipCm} min={40} max={300} step="0.1" optional />
        </div>
        <ChoiceGroup label={t("gymProfile.level")} value={sportLevel || null} options={[
          { value: "beginner", label: t("gymProfile.levelBeginner") },
          { value: "intermediate", label: t("gymProfile.levelIntermediate") },
          { value: "advanced", label: t("gymProfile.levelAdvanced") },
        ]} onChange={(value) => setSportLevel((value ?? "") as Level)} />
        <ChoiceGroup label={t("gymProfile.goal")} value={goal || null} options={[
          { value: "muscle_gain", label: t("gymProfile.goalMuscleGain") },
          { value: "fat_loss", label: t("gymProfile.goalFatLoss") },
          { value: "weight_loss", label: t("gymProfile.goalWeightLoss") },
          { value: "maintenance", label: t("gymProfile.goalMaintenance") },
          { value: "body_recomposition", label: t("gymProfile.goalRecomposition") },
        ]} onChange={(value) => setGoal((value ?? "") as Goal)} />
        <ChoiceGroup label={t("gymProfile.sessions")} value={sessions || null} options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))} onChange={(value) => setSessions(value ?? "")} />
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="h-12 w-full bg-sage text-white hover:bg-sage/90" disabled={!complete || save.isPending}>
          {save.isPending ? t("gymProfile.saving") : t("gymProfile.finish")}
        </Button>
      </form>
    </Card>
  )
}

function NumberField({ id, label, value, onChange, min, max, step = "1", optional = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; min: number; max: number; step?: string; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}{optional && ` (${t("gymProfile.optional")})`}</Label>
      <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} step={step} required={!optional} />
    </div>
  )
}
