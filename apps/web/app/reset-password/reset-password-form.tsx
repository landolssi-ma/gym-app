"use client"

import Link from "next/link"
import { useState } from "react"

import { resetPassword } from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Alert } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

import { Wordmark } from "@/components/wordmark"

type State = "idle" | "pending" | "done" | "invalid" | "short" | "breached"

// Better Auth sends the email link to /api/auth/reset-password/<token>, which redirects here with
// ?token= (valid) or ?error= (expired or used).
export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("")
  const [state, setState] = useState<State>(token ? "idle" : "invalid")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setState("short")
    setState("pending")
    const res = await resetPassword(token!, password)
    setState(res.ok ? "done" : res.code === "PASSWORD_COMPROMISED" ? "breached" : "invalid")
  }

  return (
    <Card className="gap-6 shadow-none">
      <Wordmark size="header" className="self-center" />
      <h1 className="text-center font-heading text-2xl font-bold tracking-tight">{t("auth.resetHeading")}</h1>
      {state === "done" ? (
        <Alert role="status">{t("auth.resetDone")}</Alert>
      ) : state === "invalid" ? (
        <Alert variant="destructive">{t("auth.resetInvalid")}</Alert>
      ) : (
        <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-password" className="font-mono text-caption font-bold tracking-widest uppercase">{t("auth.passwordLabel")}</Label>
            <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={state === "short" || state === "breached" || undefined} aria-describedby="reset-password-hint" />
            <p id="reset-password-hint" role={state === "short" || state === "breached" ? "alert" : undefined} className={state === "short" || state === "breached" ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
              {t(state === "short" ? "auth.passwordShort" : state === "breached" ? "auth.passwordBreached" : "auth.passwordHint")}
            </p>
          </div>
          <Button type="submit" className="press h-12 w-full shadow-brand" disabled={state === "pending"}>
            {state === "pending" && <Spinner />}
            {t("auth.resetSubmit")}
          </Button>
        </form>
      )}
      <Link href="/sign-in" className="self-center text-sm underline underline-offset-2">
        {t("auth.logIn")}
      </Link>
    </Card>
  )
}
