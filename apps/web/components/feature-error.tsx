"use client"

import { Component, Suspense, useSyncExternalStore, type ReactNode } from "react"

import { QueryErrorResetBoundary } from "@tanstack/react-query"

import { t } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardDescription, CardHeader } from "@workspace/ui/components/card"

// A fixed generic message only -- never the caught error's own message or stack trace,
// which may carry backend internals or raw user input, so those details never reach the DOM.
export function FeatureError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{t("errors.generic")}</CardDescription>
      </CardHeader>
      <Button className="self-start" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </Card>
  )
}

// No react-error-boundary dependency (ponytail: don't add a package for a few lines) -- a class
// component is still the only way to catch render errors, so this one stays as small as possible
// and is used only through FeatureBoundary below.
class ErrorBoundary extends Component<{ onReset: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  retry = () => {
    this.props.onReset()
    this.setState({ hasError: false })
  }

  render() {
    return this.state.hasError ? <FeatureError onRetry={this.retry} /> : this.props.children
  }
}

const subscribe = () => () => {}

// The one shared composition every converted screen's data component wraps itself in
// (boundary scoped per data component, not once per page). QueryErrorResetBoundary's reset
// clears TanStack Query's cached error so the retried render re-queries instead of re-throwing
// the same stale error.
export function FeatureBoundary({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  // Authenticated relative requests need the browser session; match SSR and hydration first.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset}>
          <Suspense fallback={skeleton}>{hydrated ? children : skeleton}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
