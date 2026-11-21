import { afterEach, describe, expect, test, vi } from "vitest"

import type { Log } from "@workspace/core"
import { messages } from "@workspace/i18n"

import { createMail, render, type Brand, type TemplateData, type TemplateName } from "../src/index"

const brand: Brand = {
  name: "Acme",
  logoUrl: "https://app.test/logo.png",
  supportEmail: "support@app.test",
  theme: { background: "#FFFFFF", text: "#121212", button: "#FFD23F", buttonText: "#121212", buttonBorder: "2px solid #121212", font: "system-ui" },
}
const config = { apiKey: "re_test", apiUrl: "https://mail.test/emails", from: "Acme <hello@app.test>", replyTo: "support@app.test", appOrigin: "https://app.test", brand }
const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) satisfies Log

afterEach(() => vi.unstubAllGlobals())

function stubFetch(status = 200, body = "{}") {
  const fetch = vi.fn(async () => new Response(body, { status }))
  vi.stubGlobal("fetch", fetch)
  return () => {
    const [target, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    return { target, init, body: JSON.parse(init.body as string) as Record<string, unknown> & { subject: string; html: string; text: string } }
  }
}

const samples: { [T in TemplateName]: TemplateData<T> } = {
  signInCode: { code: "34350105", minutes: 10 },
  verifyEmail: { url: "https://app.test/api/auth/verify-email?token=a&callbackURL=/" },
  passwordReset: { url: "https://app.test/reset-password?token=a&x=1" },
  welcome: { appUrl: "https://app.test/dashboard" },
}
const names = Object.keys(samples) as TemplateName[]

describe("createMail().send", () => {
  test("posts the Resend shape with sender, reply-to and escaped html", async () => {
    const sent = stubFetch()
    await createMail(config).send("passwordReset", "u@x.test", samples.passwordReset)
    const { target, init, body } = sent()
    expect(target).toBe("https://mail.test/emails")
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer re_test")
    expect(body).toMatchObject({ from: "Acme <hello@app.test>", to: ["u@x.test"], reply_to: "support@app.test" })
    expect(body.html).toContain("token=a&amp;x=1")
    expect(body.text).toContain("token=a&x=1")
  })

  test("a provider error rejects with the template and status, logged without the body", async () => {
    stubFetch(500, "secret detail")
    const log = fakeLog()
    await expect(createMail({ ...config, log }).send("signInCode", "u@x.test", samples.signInCode)).rejects.toThrow(/^mail send failed: signInCode 500$/)
    expect(log.error).toHaveBeenCalledWith("mail_send_failed", { template: "signInCode", status: 500 })
    expect(JSON.stringify(log.error.mock.calls)).not.toContain("34350105")
  })

  test("a link off the app origin is refused before anything is sent", async () => {
    const sent = vi.fn()
    vi.stubGlobal("fetch", sent)
    await expect(createMail(config).send("passwordReset", "u@x.test", { url: "https://evil.test/reset" })).rejects.toThrow(/APP_ORIGIN/)
    expect(sent).not.toHaveBeenCalled()
  })

  test("in local dev without a key, logs recipient, subject, links and code instead of sending", async () => {
    const sent = vi.fn()
    vi.stubGlobal("fetch", sent)
    const log = fakeLog()
    const mail = createMail({ ...config, apiKey: "", appOrigin: "http://localhost:5173", log })
    await mail.send("signInCode", "u@x.test", samples.signInCode)
    expect(sent).not.toHaveBeenCalled()
    expect(log.info).toHaveBeenCalledWith("mail_logged", { template: "signInCode", to: "u@x.test", subject: "34350105 is your Acme sign-in code", links: [], code: "34350105" })
  })

  test("in local dev sends through an HTTP mail relay without a Resend key", async () => {
    const sent = stubFetch(202)
    await createMail({
      ...config,
      apiKey: "",
      apiUrl: "http://127.0.0.1:8025/send",
      appOrigin: "http://localhost:5173",
    }).send("signInCode", "u@x.test", samples.signInCode)
    const { target, init, body } = sent()
    expect(target).toBe("http://127.0.0.1:8025/send")
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("content-type")).toBe("application/json")
    expect(body).toMatchObject({ to: ["u@x.test"], subject: "34350105 is your Acme sign-in code" })
  })

  test("without a key on a deployed (https) origin, creating the client is a configuration error", () => {
    expect(() => createMail({ ...config, apiKey: "" })).toThrow("RESEND_API_KEY")
  })
})

describe("templates", () => {
  test.each(names)("%s has a subject from en.json, matching html and text bodies, and the shared layout", (name) => {
    const email = render(name, samples[name] as never, brand)
    expect(email.subject.length).toBeGreaterThan(0)
    expect(email.html).toContain('src="https://app.test/logo.png"')
    expect(email.html).toContain("Acme · Questions? Write to support@app.test.")
    expect(email.text).toContain("Acme · Questions? Write to support@app.test.")
    // Every link in the html is absolute on the app origin and appears in the text too.
    for (const [, href] of email.html.matchAll(/href="([^"]+)"/g)) {
      expect(href).toMatch(/^https:\/\/app\.test\//)
      expect(email.text).toContain(href!.replaceAll("&amp;", "&"))
    }
  })

  test("subjects come from the string catalog", () => {
    expect(render("welcome", samples.welcome, brand).subject).toBe(messages.mail.welcomeSubject.replace("{product}", "Acme"))
  })

  test("sign-in code shows the code, its 10-minute expiry, and the same code in text", () => {
    const email = render("signInCode", samples.signInCode, brand)
    expect(email.subject).toBe("34350105 is your Acme sign-in code")
    expect(email.html).toContain(">34350105<")
    expect(email.text).toContain("34350105")
    expect(email.text).toContain("expires in 10 minutes")
  })

  test("brand values come from config: a new logo and button color reach every email", () => {
    const rebranded = { ...brand, logoUrl: "https://app.test/new-logo.png", theme: { ...brand.theme, button: "#000000" } }
    for (const name of names) {
      const html = render(name, samples[name] as never, rebranded).html
      expect(html).toContain("new-logo.png")
      if (html.includes("<a href")) expect(html).toContain("background:#000000")
    }
  })
})
