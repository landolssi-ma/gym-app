import { t } from "@workspace/i18n"

export type Brand = {
  name: string
  logoUrl: string
  supportEmail: string
  // Email clients ignore CSS variables, so brand colors arrive as literal values.
  theme: { background: string; text: string; button: string; buttonText: string; buttonBorder: string; font: string }
}

// What a template decides; the layout decides how it looks.
export type EmailParts = {
  subject: string
  preview?: string
  paragraphs: string[]
  // Shown large on its own line, for example a sign-in code.
  code?: string
  button?: { label: string; url: string }
}

export type EmailContent = { subject: string; html: string; text: string }

const ENTITY: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
export const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ENTITY[ch]!)

// One layout for every email: logo, body, at most one button, footer. HTML and text carry the same content.
export function renderEmail(parts: EmailParts, brand: Brand): EmailContent {
  const m = brand.theme
  const footer = t("mail.footer", { product: brand.name, supportEmail: brand.supportEmail })
  const ignore = t("mail.ignore")
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:${m.background};color:${m.text};font-family:${esc(m.font)}">
${parts.preview ? `<span style="display:none">${esc(parts.preview)}</span>` : ""}
<p><img src="${esc(brand.logoUrl)}" alt="${esc(brand.name)}" height="32"></p>
${parts.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n")}
${parts.code ? `<p style="font-size:32px;font-weight:700;letter-spacing:0.2em">${esc(parts.code)}</p>` : ""}
${parts.button ? `<p><a href="${esc(parts.button.url)}" style="display:inline-block;padding:12px 20px;background:${m.button};color:${m.buttonText};border:${m.buttonBorder};font-weight:700;text-decoration:none">${esc(parts.button.label)}</a></p>` : ""}
<p style="font-size:13px">${esc(ignore)}</p>
<p style="font-size:13px">${esc(footer)}</p>
</body></html>`
  const text = [
    ...parts.paragraphs,
    ...(parts.code ? [parts.code] : []),
    ...(parts.button ? [`${parts.button.label}: ${parts.button.url}`] : []),
    ignore,
    footer,
  ].join("\n\n")
  return { subject: parts.subject, html, text: `${text}\n` }
}
