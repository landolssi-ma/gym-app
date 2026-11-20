"use client"

import { t } from "@workspace/i18n"
import { Alert } from "@workspace/ui/components/alert"
import { Card } from "@workspace/ui/components/card"

import { Wordmark } from "@/components/wordmark"
import { site } from "@/config/site"
import { SignInPanel } from "@/features/auth"

// `next` is already validated by sign-in/page.tsx (safeNext) before it reaches this component.
export function SignInForm({ error, next, signup }: { error?: string; next?: string | null; signup?: boolean }) {
  const to = next ?? "/post-sign-in"
  // Better Auth's callback error: an expired verification or reset link, a banned account (Google), or a failed Google sign-in.
  const alert = !error ? null : error === "EXPIRED_TOKEN" || error === "INVALID_TOKEN" || error === "TOKEN_EXPIRED" ? "auth.errorLinkExpired" : /banned/i.test(error) ? "auth.banned" : "auth.errorGoogle"
  return (
    <Card className="gap-6 shadow-none">
      <Wordmark size="header" className="self-center" />
      {alert && <Alert variant="destructive">{t(alert, { supportEmail: site.supportEmail })}</Alert>}
      <SignInPanel title="h1" initialVariant={signup ? "signup" : "code"} returnTo={to} onSignedIn={() => window.location.assign(to)} />
    </Card>
  )
}
