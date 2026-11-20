"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { SURVEY } from "@workspace/api/survey"
import { t, type Messages } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

import { ChoiceGroup } from "@/components/choice-group"
import { meKeys, useMe } from "@/features/auth"
import { ApiError, apiFetch } from "@/lib/api-fetch"
import { errorMessage } from "@/lib/errors"
import { apiClient } from "@/lib/hc-client"

type Key = `survey.${keyof Messages["survey"]}`

// One question at a time. Each answer is saved as it is picked, so a reload resumes where it was.
export function Survey() {
  const { data: me } = useMe()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<string, string>>(me.onboarding?.answers ?? {})
  const [step, setStep] = useState(() => Math.max(0, SURVEY.findIndex((q) => !me.onboarding?.answers[q.id])))
  const [error, setError] = useState<string | null>(null)
  const question = SURVEY[step]!
  const last = step === SURVEY.length - 1

  const save = useMutation({
    mutationFn: async (body: { answers: Record<string, string>; complete?: true }) => {
      const res = await apiClient(apiFetch).api.me.onboarding.$put({ json: body })
      if (!res.ok) throw new ApiError(res.status, ((await res.json()) as { error?: string }).error ?? "unknown")
    },
  })

  async function next() {
    setError(null)
    try {
      if (!last) return setStep(step + 1)
      await save.mutateAsync({ answers, complete: true })
      await queryClient.invalidateQueries({ queryKey: meKeys.all })
      router.replace("/post-sign-in")
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.message : undefined))
    }
  }

  return (
    <Card className="w-full gap-6 p-6 shadow-none">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs text-muted-foreground">{t("survey.step", { n: step + 1, total: SURVEY.length })}</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {t(question.label as Key)}
          {!question.required && <span className="ml-2 text-sm font-normal text-muted-foreground">{t("survey.optional")}</span>}
        </h1>
      </div>
      <ChoiceGroup
        label={t(question.label as Key)}
        options={question.options.map((o) => ({ value: o.value, label: t(o.label as Key) }))}
        value={answers[question.id] ?? null}
        optional={!question.required}
        onChange={(value) => {
          const nextAnswers = { ...answers }
          if (value) nextAnswers[question.id] = value
          else delete nextAnswers[question.id]
          setAnswers(nextAnswers)
          if (value) save.mutate({ answers: { [question.id]: value } })
        }}
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-3">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          {t("survey.back")}
        </Button>
        <Button disabled={(question.required && !answers[question.id]) || save.isPending} onClick={next}>
          {t(last ? "survey.finish" : "survey.next")}
        </Button>
      </div>
    </Card>
  )
}
