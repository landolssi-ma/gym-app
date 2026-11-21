import { createLog, type Log } from "@workspace/core"

import { renderEmail, type Brand, type EmailContent } from "./layout"
import { templates, type TemplateData, type TemplateName } from "./templates"

export type { Brand, EmailContent, TemplateData, TemplateName }
export { templates }

export type MailConfig = {
  // Empty means "do not send": allowed only on a local origin, where emails are logged instead.
  apiKey: string
  apiUrl: string
  from: string
  replyTo: string
  appOrigin: string
  brand: Brand
  log?: Log
}

export class MailError extends Error {
  constructor(readonly template: TemplateName, readonly status: number) {
    super(`mail send failed: ${template} ${status}`)
    this.name = "MailError"
  }
}

const isLocal = (origin: string) => origin.startsWith("http:")

export function render<T extends TemplateName>(template: T, data: TemplateData<T>, brand: Brand): EmailContent {
  const build = templates[template] as (data: TemplateData<T>, product: string) => Parameters<typeof renderEmail>[0]
  return renderEmail(build(data, brand.name), brand)
}

// Resend REST (POST {from,to,subject,html,text,reply_to}); no SDK needed for one call.
export function createMail(c: MailConfig) {
  if (!c.apiKey && !isLocal(c.appOrigin)) throw new Error("Invalid config: RESEND_API_KEY: is required unless APP_ORIGIN is a local http origin")
  const log = c.log ?? createLog()
  return {
    async send<T extends TemplateName>(template: T, to: string, data: TemplateData<T>): Promise<void> {
      // A link off the app origin is a bug in the caller, never something to email.
      const links = Object.values(data).filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v))
      const offOrigin = links.filter((url) => new URL(url).origin !== c.appOrigin)
      if (offOrigin.length) throw new Error(`mail ${template}: links must be absolute URLs on APP_ORIGIN`)
      const content = render(template, data, c.brand)
      if (!c.apiKey) {
        if (URL.canParse(c.apiUrl) && new URL(c.apiUrl).protocol === "http:") {
          const res = await fetch(c.apiUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ from: c.from, to: [to], reply_to: c.replyTo, ...content }),
          })
          if (!res.ok) {
            log.error("mail_send_failed", { template, status: res.status })
            throw new MailError(template, res.status)
          }
          return
        }
        // Local dev without an email provider: everything a developer needs to finish the flow.
        const code = "code" in data ? String(data.code) : undefined
        log.info("mail_logged", { template, to, subject: content.subject, links, ...(code && { code }) })
        return
      }
      const res = await fetch(c.apiUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${c.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: c.from, to: [to], reply_to: c.replyTo, ...content }),
      })
      if (!res.ok) {
        // Template and status only: the body may echo the address or key, and the email holds links and codes.
        log.error("mail_send_failed", { template, status: res.status })
        throw new MailError(template, res.status)
      }
    },
  }
}
export type Mail = ReturnType<typeof createMail>
