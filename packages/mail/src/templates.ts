import { t } from "@workspace/i18n"

import type { EmailParts } from "./layout"

const date = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" })

// Each template turns its data into words and at most one link; the layout does the rest.
// Every url must be absolute on the app origin (checked in createMail().send).
export const templates = {
  signInCode: ({ code, minutes }: { code: string; minutes: number }, product: string): EmailParts => ({
    subject: t("mail.signInCodeSubject", { code, product }),
    preview: t("mail.signInCodePreview", { code, product }),
    paragraphs: [t("mail.signInCodeBody", { minutes })],
    code,
  }),
  verifyEmail: ({ url }: { url: string }, product: string): EmailParts => ({
    subject: t("mail.verifyEmailSubject", { product }),
    paragraphs: [t("mail.verifyEmailBody", { product })],
    button: { label: t("mail.verifyEmailButton"), url },
  }),
  passwordReset: ({ url }: { url: string }, product: string): EmailParts => ({
    subject: t("mail.passwordResetSubject", { product }),
    paragraphs: [t("mail.passwordResetBody")],
    button: { label: t("mail.passwordResetButton"), url },
  }),
  teamInvite: ({ inviterName, organizationName, acceptUrl }: { inviterName: string; organizationName: string; acceptUrl: string }, product: string): EmailParts => ({
    subject: t("mail.teamInviteSubject", { organizationName, product }),
    paragraphs: [t("mail.teamInviteBody", { inviterName, organizationName, product })],
    button: { label: t("mail.teamInviteButton"), url: acceptUrl },
  }),
  welcome: ({ appUrl }: { appUrl: string }, product: string): EmailParts => ({
    subject: t("mail.welcomeSubject", { product }),
    paragraphs: [t("mail.welcomeBody", { product })],
    button: { label: t("mail.welcomeButton", { product }), url: appUrl },
  }),
  trialReminder: ({ trialEndsAt, cancelUrl }: { trialEndsAt: Date; cancelUrl: string }): EmailParts => ({
    subject: t("mail.trialReminderSubject"),
    paragraphs: [t("mail.trialReminderBody", { trialEndsAt: date(trialEndsAt) })],
    button: { label: t("mail.trialReminderButton"), url: cancelUrl },
  }),
  subscriptionStarted: ({ planName, priceUsd, interval }: { planName: string; priceUsd: number; interval: "month" | "year" }, product: string): EmailParts => ({
    subject: t("mail.subscriptionStartedSubject"),
    paragraphs: [t("mail.subscriptionStartedBody", { planName, price: usd(priceUsd), interval, product })],
  }),
  subscriptionCanceled: ({ periodEndsAt, resumeUrl }: { periodEndsAt: Date; resumeUrl: string }): EmailParts => ({
    subject: t("mail.subscriptionCanceledSubject"),
    paragraphs: [t("mail.subscriptionCanceledBody", { periodEndsAt: date(periodEndsAt) })],
    button: { label: t("mail.subscriptionCanceledButton"), url: resumeUrl },
  }),
  paymentFailed: ({ updatePaymentUrl }: { updatePaymentUrl: string }): EmailParts => ({
    subject: t("mail.paymentFailedSubject"),
    paragraphs: [t("mail.paymentFailedBody")],
    button: { label: t("mail.paymentFailedButton"), url: updatePaymentUrl },
  }),
}

export type Templates = typeof templates
export type TemplateName = keyof Templates
export type TemplateData<T extends TemplateName> = Parameters<Templates[T]>[0]
