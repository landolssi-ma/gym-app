"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import {
  requestPasswordReset,
  sendSignInCode,
  signInWithCode,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@workspace/auth/client"
import { t } from "@workspace/i18n"
import { Alert } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

import { site } from "@/config/site"
import { usePublicConfig } from "@/lib/public-config"

// The sign-in UI. Code by email is the default; password and sign-up are variants that keep the typed email.

type Variant = "code" | "password" | "signup"
type Message = Parameters<typeof t>[0]
export const RESEND_SECONDS = 60
const CODE_RE = /^\d{8}$/

export function SignInPanel({
  returnTo,
  onSignedIn,
  title: Title = "h2",
  initialVariant = "code",
}: {
  // Where Google brings the visitor back (relative path, checked by Better Auth's trustedOrigins).
  returnTo: string
  onSignedIn: () => void
  title?: "h1" | "h2"
  initialVariant?: "code" | "signup"
}) {
  const [variant, setVariant] = useState<Variant>(initialVariant)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [pending, setPending] = useState<"google" | "submit" | null>(null)
  const [error, setError] = useState<{ field: "email" | "code" | "password" | "form"; key: Message } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const { googleEnabled } = usePublicConfig()
  // A banned account's refusal, from any method: the suspended message with the support email.
  const banned = (code?: string) => {
    if (code !== "BANNED_USER") return false
    setError({ field: "form", key: "auth.banned" })
    return true
  }

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resendIn])

  const switchTo = (v: Variant) => {
    setVariant(v)
    setError(null)
    setNotice(null)
    setSentTo(null)
  }
  const validEmail = () => {
    if (emailRef.current?.checkValidity() && email.trim()) return true
    setError({ field: "email", key: "auth.emailInvalid" })
    emailRef.current?.focus()
    return false
  }

  async function google() {
    setError(null)
    setPending("google")
    const res = await signInWithGoogle({ callbackURL: returnTo, errorCallbackURL: returnTo })
    if (!res.ok) {
      setPending(null)
      setError({ field: "form", key: "auth.errorGoogle" })
    }
  }

  async function sendCode() {
    if (!validEmail()) return
    setPending("submit")
    const res = await sendSignInCode(email.trim())
    setPending(null)
    if (!res.ok) return setError({ field: "email", key: res.status === 429 ? "auth.errorRateLimited" : "auth.errorSendFailed" })
    setError(null)
    setCode("")
    setSentTo(email.trim())
    setResendIn(RESEND_SECONDS)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (variant === "code" && !sentTo) return sendCode()
    if (variant === "code") {
      if (!CODE_RE.test(code)) return setError({ field: "code", key: "auth.codeWrong" })
      setPending("submit")
      const res = await signInWithCode(sentTo!, code)
      setPending(null)
      if (res.ok) return onSignedIn()
      if (banned(res.code)) return
      return setError({ field: "code", key: res.code === "TOO_MANY_ATTEMPTS" || res.code === "OTP_EXPIRED" ? "auth.codeExpired" : "auth.codeWrong" })
    }
    if (!validEmail()) return
    if (password.length < 8) return setError({ field: "password", key: variant === "signup" ? "auth.passwordShort" : "auth.passwordWrong" })
    setPending("submit")
    // The verification link signs the person in and lands on the return path.
    const res = variant === "signup" ? await signUpWithPassword(email.trim(), password, returnTo) : await signInWithPassword(email.trim(), password, returnTo)
    setPending(null)
    if (res.ok && variant === "signup") return setNotice(t("auth.signUpSent", { email: email.trim() }))
    if (res.ok) return onSignedIn()
    if (banned(res.code)) return
    // Better Auth resends the confirmation link on this refusal.
    if (res.code === "EMAIL_NOT_VERIFIED") return setNotice(t("auth.emailNotVerified", { email: email.trim() }))
    if (variant === "password") return setError({ field: "password", key: res.status === 429 ? "auth.errorRateLimited" : "auth.passwordWrong" })
    if (res.code === "PASSWORD_COMPROMISED") return setError({ field: "password", key: "auth.passwordBreached" })
    if (res.code === "PASSWORD_TOO_SHORT") return setError({ field: "password", key: "auth.passwordShort" })
    // An existing email gets the same "check your inbox" answer, so sign-up does not reveal accounts.
    setNotice(t("auth.signUpSent", { email: email.trim() }))
  }

  async function forgot() {
    if (!validEmail()) return
    setPending("submit")
    await requestPasswordReset(email.trim(), "/reset-password")
    setPending(null)
    setNotice(t("auth.resetSent", { email: email.trim() }))
  }

  const fieldError = (field: "email" | "code" | "password") =>
    error?.field === field ? (
      <p id={`signin-${field}-error`} role="alert" className="text-sm font-medium text-destructive">
        {t(error.key, { supportEmail: site.supportEmail })}
      </p>
    ) : null
  const describedBy = (field: "email" | "code" | "password", hint?: string) =>
    [hint, error?.field === field && `signin-${field}-error`].filter(Boolean).join(" ") || undefined

  const heading = variant === "signup" ? t("auth.signUpHeading") : t("auth.heading")
  const body = variant === "signup" ? t("auth.signUpBody") : t(googleEnabled ? "auth.subheading" : "auth.subheadingEmailOnly")

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-center">
        <Title className="font-heading text-2xl font-bold tracking-tight">{heading}</Title>
        <p className="text-muted-foreground">{body}</p>
      </div>

      {error?.field === "form" && <Alert variant="destructive">{t(error.key, { supportEmail: site.supportEmail })}</Alert>}
      {notice && <Alert role="status">{notice}</Alert>}

      {googleEnabled && (
        <>
          <Button variant="secondary" className="press w-full border-(length:--border-width-strong) border-border-strong bg-card shadow-ink" disabled={!!pending} onClick={google}>
            {pending === "google" && <Spinner />}
            {t(pending === "google" ? "auth.googlePending" : "auth.google")}
          </Button>
          <p className="flex items-center gap-3 font-mono text-caption tracking-widest text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            {t("auth.continueWithEmail")}
            <span className="h-px flex-1 bg-border" />
          </p>
        </>
      )}

      <form className="flex flex-col gap-4" noValidate onSubmit={submit}>
        {sentTo ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">{t("auth.codeSentTo", { email: sentTo })}</p>
            <Label htmlFor="signin-code" className="font-mono text-caption font-bold tracking-widest uppercase">{t("auth.codeLabel")}</Label>
            <Input
              id="signin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-invalid={error?.field === "code" || undefined}
              aria-describedby={describedBy("code")}
              className="text-center text-lg tracking-widest tabular-nums"
            />
            {fieldError("code")}
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <button type="button" className="underline underline-offset-2" onClick={() => switchTo("code")}>
                {t("auth.differentEmail")}
              </button>
              <button type="button" className="underline underline-offset-2 disabled:no-underline disabled:text-muted-foreground" disabled={resendIn > 0 || !!pending} onClick={sendCode}>
                {resendIn > 0 ? t("auth.codeResendIn", { s: resendIn }) : t("auth.codeResend")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="signin-email" className="font-mono text-caption font-bold tracking-widest uppercase">{t("auth.emailLabel")}</Label>
            <Input
              ref={emailRef}
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error?.field === "email" || undefined}
              aria-describedby={describedBy("email", variant === "code" ? "signin-email-hint" : undefined)}
            />
            {variant === "code" && (
              <p id="signin-email-hint" className="text-sm text-muted-foreground">
                {t("auth.codeHint")}
              </p>
            )}
            {fieldError("email")}
          </div>
        )}

        {variant !== "code" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="signin-password" className="font-mono text-caption font-bold tracking-widest uppercase">{t("auth.passwordLabel")}</Label>
            <Input
              id="signin-password"
              type="password"
              autoComplete={variant === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error?.field === "password" || undefined}
              aria-describedby={describedBy("password", variant === "signup" ? "signin-password-hint" : undefined)}
            />
            {variant === "signup" && (
              <p id="signin-password-hint" className="text-sm text-muted-foreground">
                {t("auth.passwordHint")}
              </p>
            )}
            {fieldError("password")}
            {variant === "password" && (
              <button type="button" className="self-start text-sm underline underline-offset-2" onClick={forgot}>
                {t("auth.forgotPassword")}
              </button>
            )}
          </div>
        )}

        <Button type="submit" className="press h-12 w-full shadow-brand" disabled={!!pending}>
          {pending === "submit" && <Spinner />}
          {t(
            variant === "signup"
              ? "auth.signUpSubmit"
              : variant === "password"
                ? "auth.passwordSubmit"
                : sentTo
                  ? pending ? "auth.codeChecking" : "auth.codeSubmit"
                  : pending ? "auth.codeSending" : "auth.codeSend"
          )}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm">
        {variant === "code" ? (
          <button type="button" className="underline underline-offset-2" onClick={() => switchTo("password")}>
            {t("auth.usePassword")}
          </button>
        ) : (
          <button type="button" className="underline underline-offset-2" onClick={() => switchTo("code")}>
            {t("auth.useCode")}
          </button>
        )}
        {variant === "signup" ? (
          <p>
            {t("auth.haveAccount")}{" "}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => switchTo("code")}>
              {t("auth.logIn")}
            </button>
          </p>
        ) : (
          <p>
            {t("auth.noAccount")}{" "}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => switchTo("signup")}>
              {t("auth.signUp")}
            </button>
          </p>
        )}
        {variant === "signup" && (
          <p className="text-center text-muted-foreground">
            {t("auth.termsLead")}{" "}
            <Link href="/terms" className="underline underline-offset-2">
              {t("auth.termsLink")}
            </Link>{" "}
            {t("auth.termsAnd")}{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              {t("auth.privacyLink")}
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  )
}
