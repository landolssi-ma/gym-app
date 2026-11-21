import { t } from "@workspace/i18n"

import type { EmailParts } from "./layout"

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
  welcome: ({ appUrl }: { appUrl: string }, product: string): EmailParts => ({
    subject: t("mail.welcomeSubject", { product }),
    paragraphs: [t("mail.welcomeBody", { product })],
    button: { label: t("mail.welcomeButton", { product }), url: appUrl },
  }),
}

export type Templates = typeof templates
export type TemplateName = keyof Templates
export type TemplateData<T extends TemplateName> = Parameters<Templates[T]>[0]
