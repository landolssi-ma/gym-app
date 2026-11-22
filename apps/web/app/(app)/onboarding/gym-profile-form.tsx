"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { ChoiceGroup } from "@/components/choice-group"
import { meKeys } from "@/features/auth"
import { ApiError, apiFetch } from "@/lib/api-fetch"

type Sex = "" | "female" | "male" | "other"
type Level = "" | "beginner" | "intermediate" | "advanced"
type Goal = "" | "muscle_gain" | "fat_loss" | "weight_loss" | "maintenance" | "body_recomposition"

const STEPS = [
  t("gymProfile.stepInfo"),
  t("gymProfile.stepMeasurements"),
  t("gymProfile.stepGoal"),
  t("gymProfile.stepLevel"),
] as const

function StepBar({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-start gap-0">
      {STEPS.map((label, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            <div className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
              i < current
                ? "border-sage bg-sage text-white"
                : i === current
                  ? "border-sage text-sage"
                  : "border-border text-muted-foreground"
            )}>
              {i < current ? (
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px flex-1 transition-colors", i < current ? "bg-sage" : "bg-border")} />
            )}
          </div>
          <span className={cn(
            "mt-1.5 hidden text-center text-xs sm:block",
            i === current ? "font-semibold text-sage" : "text-muted-foreground"
          )}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// SVG icons for goal cards
const GoalIcons: Record<string, React.ReactNode> = {
  muscle_gain: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="10" width="4" height="4" rx="1" /><rect x="18" y="10" width="4" height="4" rx="1" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <rect x="8" y="8" width="2" height="8" rx="1" /><rect x="14" y="8" width="2" height="8" rx="1" />
    </svg>
  ),
  fat_loss: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c-1 3-4 5-4 9a4 4 0 008 0c0-4-3-6-4-9z" />
      <path d="M10 15c0 1.1.9 2 2 2" />
    </svg>
  ),
  weight_loss: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 00-3 3H5a1 1 0 00-1 1v2a9 9 0 0016 0V6a1 1 0 00-1-1h-4a3 3 0 00-3-3z" />
      <path d="M12 12v4M9 15l3 3 3-3" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a9 9 0 110-18 9 9 0 010 18z" />
      <path d="M12 8v4l3 3" />
    </svg>
  ),
  body_recomposition: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L4 7m3-3l3 3" />
      <path d="M17 8v12m0 0l3-3m-3 3l-3-3" />
    </svg>
  ),
}

export function GymProfileForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
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
          sex, age: Number(age), heightCm: Number(heightCm),
          weightKg: Number(weightKg), waistCm: Number(waistCm),
          ...(hipCm ? { hipCm: Number(hipCm) } : {}),
          sportLevel, goal, sessionsPerWeek: Number(sessions),
        }),
      })
      if (!res.ok) throw new ApiError(res.status, ((await res.json()) as { error?: string }).error ?? "invalid")
    },
  })

  const canNext = [
    !!sex && !!age,
    !!heightCm && !!weightKg && !!waistCm,
    !!goal,
    !!sportLevel && !!sessions,
  ][step]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (step < 3) { setStep(step + 1); return }
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
    <form className="flex flex-col" onSubmit={submit}>
      <StepBar current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-charcoal">{t("gymProfile.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("gymProfile.subtitle")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{t("gymProfile.sex")}</p>
            <ChoiceGroup label={t("gymProfile.sex")} value={sex || null} layout="list" options={[
              { value: "female", label: t("gymProfile.sexFemale") },
              { value: "male", label: t("gymProfile.sexMale") },
              { value: "other", label: t("gymProfile.sexOther") },
            ]} onChange={(v) => setSex((v ?? "") as Sex)} />
          </div>
          <NumberField id="age" label={t("gymProfile.age")} value={age} onChange={setAge} min={13} max={120} />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-charcoal">{t("gymProfile.stepMeasurements")}</h1>
            <p className="mt-1 text-muted-foreground">{t("gymProfile.subtitle")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField id="height" label={t("gymProfile.height")} value={heightCm} onChange={setHeightCm} min={80} max={250} />
            <NumberField id="weight" label={t("gymProfile.weight")} value={weightKg} onChange={setWeightKg} min={20} max={500} step="0.1" />
            <NumberField id="waist" label={t("gymProfile.waist")} value={waistCm} onChange={setWaistCm} min={40} max={300} step="0.1" />
            <NumberField id="hip" label={t("gymProfile.hip")} value={hipCm} onChange={setHipCm} min={40} max={300} step="0.1" optional />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-charcoal">{t("gymProfile.goal")}</h1>
            <p className="mt-1 text-muted-foreground">{t("gymProfile.goalSubtitle")}</p>
          </div>
          <ChoiceGroup label={t("gymProfile.goal")} value={goal || null} layout="grid" options={[
            { value: "muscle_gain", label: t("gymProfile.goalMuscleGain"), description: t("gymProfile.goalMuscleGainDesc"), icon: GoalIcons.muscle_gain },
            { value: "fat_loss", label: t("gymProfile.goalFatLoss"), description: t("gymProfile.goalFatLossDesc"), icon: GoalIcons.fat_loss },
            { value: "weight_loss", label: t("gymProfile.goalWeightLoss"), description: t("gymProfile.goalWeightLossDesc"), icon: GoalIcons.weight_loss },
            { value: "maintenance", label: t("gymProfile.goalMaintenance"), description: t("gymProfile.goalMaintenanceDesc"), icon: GoalIcons.maintenance },
            { value: "body_recomposition", label: t("gymProfile.goalRecomposition"), description: t("gymProfile.goalRecompositionDesc"), icon: GoalIcons.body_recomposition },
          ]} onChange={(v) => setGoal((v ?? "") as Goal)} />
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/60 px-4 py-3">
            <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-sage" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
            </svg>
            <p className="text-xs text-muted-foreground">Your goal shapes your personalised programme. You can update it later in settings.</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-charcoal">{t("gymProfile.level")}</h1>
            <p className="mt-1 text-muted-foreground">{t("gymProfile.levelSubtitle")}</p>
          </div>
          <ChoiceGroup label={t("gymProfile.level")} value={sportLevel || null} layout="list" options={[
            { value: "beginner", label: t("gymProfile.levelBeginner"), description: t("gymProfile.levelBeginnerDesc") },
            { value: "intermediate", label: t("gymProfile.levelIntermediate"), description: t("gymProfile.levelIntermediateDesc") },
            { value: "advanced", label: t("gymProfile.levelAdvanced"), description: t("gymProfile.levelAdvancedDesc") },
          ]} onChange={(v) => setSportLevel((v ?? "") as Level)} />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{t("gymProfile.sessions")}</p>
            <p className="text-xs text-muted-foreground">{t("gymProfile.sessionsSubtitle")}</p>
            <ChoiceGroup label={t("gymProfile.sessions")} value={sessions || null} layout="row"
              options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(v) => setSessions(v ?? "")} />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
            ← {t("gymProfile.back")}
          </Button>
        ) : <div />}
        <Button
          type="submit"
          className="bg-sage text-white hover:bg-sage/90"
          disabled={!canNext || save.isPending}
        >
          {step < 3
            ? <>{t("gymProfile.next")} →</>
            : save.isPending ? t("gymProfile.saving") : t("gymProfile.finish")}
        </Button>
      </div>
    </form>
  )
}

function NumberField({ id, label, value, onChange, min, max, step = "1", optional = false }: {
  id: string; label: string; value: string; onChange: (v: string) => void; min: number; max: number; step?: string; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}{optional && ` (${t("gymProfile.optional")})`}</Label>
      <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
        min={min} max={max} step={step} required={!optional} />
    </div>
  )
}
