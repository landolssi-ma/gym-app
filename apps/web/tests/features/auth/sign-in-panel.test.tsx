// @vitest-environment happy-dom
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type R = { ok: boolean; status?: number; code?: string }
const auth = vi.hoisted(() => ({
  sendSignInCode: vi.fn(async (): Promise<R> => ({ ok: true })),
  signInWithCode: vi.fn(async (): Promise<R> => ({ ok: true })),
  signInWithPassword: vi.fn(async (): Promise<R> => ({ ok: true })),
  signUpWithPassword: vi.fn(async (): Promise<R> => ({ ok: true })),
  signInWithGoogle: vi.fn(async (): Promise<R> => ({ ok: true })),
  requestPasswordReset: vi.fn(async (): Promise<R> => ({ ok: true })),
}))
vi.mock("@workspace/auth/client", () => auth)
const config = vi.hoisted(() => ({ googleEnabled: true }))
vi.mock("@/lib/public-config", () => ({ usePublicConfig: () => ({ appOrigin: "https://app.test", posthog: undefined, ...config }) }))

import { SignInPanel } from "../../../features/auth/components/sign-in-panel"

import { byText, click, mount, type } from "../../helpers/dom"

let m: ReturnType<typeof mount>
beforeEach(() => {
  m = mount()
  config.googleEnabled = true
  for (const f of Object.values(auth)) f.mockClear()
})
afterEach(async () => m.unmount())

const submit = () => act(async () => m.container.querySelector("form")!.requestSubmit())
const text = () => m.container.textContent ?? ""

describe("sign-in panel", () => {
  it("an emailed code signs in", async () => {
    const onSignedIn = vi.fn()
    await m.render(<SignInPanel returnTo="/projects" onSignedIn={onSignedIn} />)
    await type(m.container.querySelector("#signin-email"), "me@company.test")
    await submit()
    expect(auth.sendSignInCode).toHaveBeenCalledWith("me@company.test")
    expect(text()).toContain("We sent an 8-digit code to me@company.test. It expires in 10 minutes.")
    expect(text()).toContain("Send a new code in 60s")
    await type(m.container.querySelector("#signin-code"), "12345678")
    await submit()
    expect(auth.signInWithCode).toHaveBeenCalledWith("me@company.test", "12345678")
    expect(onSignedIn).toHaveBeenCalled()
  })

  it("a wrong code shows an error; too many tries asks for a new code", async () => {
    auth.signInWithCode.mockResolvedValueOnce({ ok: false, status: 400, code: "INVALID_OTP" }).mockResolvedValueOnce({ ok: false, status: 403, code: "TOO_MANY_ATTEMPTS" })
    await m.render(<SignInPanel returnTo="/" onSignedIn={() => {}} />)
    await type(m.container.querySelector("#signin-email"), "me@company.test")
    await submit()
    await type(m.container.querySelector("#signin-code"), "00000000")
    await submit()
    expect(m.container.querySelector("#signin-code-error")?.textContent).toContain("didn't work")
    await submit()
    expect(m.container.querySelector("#signin-code-error")?.textContent).toContain("Send a new one")
  })

  it("an email the provider could not send to shows the failure so the user can retry", async () => {
    auth.sendSignInCode.mockResolvedValueOnce({ ok: false, status: 500 })
    await m.render(<SignInPanel returnTo="/" onSignedIn={() => {}} />)
    await type(m.container.querySelector("#signin-email"), "me@company.test")
    await submit()
    expect(m.container.querySelector("#signin-email-error")?.textContent).toContain("couldn't send")
    expect(m.container.querySelector("#signin-email")).not.toBeNull()
  })

  it("switching to password keeps the typed email and offers a reset", async () => {
    await m.render(<SignInPanel returnTo="/" onSignedIn={() => {}} />)
    await type(m.container.querySelector("#signin-email"), "keep@company.test")
    await click(byText("Use a password instead", "button"))
    expect(m.container.querySelector<HTMLInputElement>("#signin-email")!.value).toBe("keep@company.test")
    await click(byText("Forgot password?", "button"))
    expect(auth.requestPasswordReset).toHaveBeenCalledWith("keep@company.test", "/reset-password")
    expect(text()).toContain("If an account exists for keep@company.test")
  })

  it("password sign-in before verification explains that a new link was sent", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ ok: false, status: 403, code: "EMAIL_NOT_VERIFIED" })
    const onSignedIn = vi.fn()
    await m.render(<SignInPanel returnTo="/" onSignedIn={onSignedIn} />)
    await click(byText("Use a password instead", "button"))
    await type(m.container.querySelector("#signin-email"), "new@company.test")
    await type(m.container.querySelector("#signin-password"), "long-enough-pass")
    await submit()
    expect(text()).toContain("Confirm your email first")
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it("sign-up refuses short and breached passwords beside the field, then asks to check the inbox without signing in", async () => {
    auth.signUpWithPassword.mockResolvedValueOnce({ ok: false, status: 400, code: "PASSWORD_COMPROMISED" })
    const onSignedIn = vi.fn()
    await m.render(<SignInPanel returnTo="/post-sign-in" onSignedIn={onSignedIn} />)
    await click(byText("Sign up", "button"))
    expect(text()).toContain("Create your account")
    expect(byText("Terms", "a")?.getAttribute("href")).toBe("/terms")
    await type(m.container.querySelector("#signin-email"), "new@company.test")
    await type(m.container.querySelector("#signin-password"), "short")
    await submit()
    expect(m.container.querySelector("#signin-password-error")?.textContent).toContain("at least 8")
    await type(m.container.querySelector("#signin-password"), "password123")
    await submit()
    expect(m.container.querySelector("#signin-password-error")?.textContent).toContain("data breach")
    await type(m.container.querySelector("#signin-password"), "a-long-clean-pass")
    await submit()
    expect(auth.signUpWithPassword).toHaveBeenLastCalledWith("new@company.test", "a-long-clean-pass", "/post-sign-in")
    expect(text()).toContain("Check your inbox")
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it("a banned account sees the suspended message with the support email", async () => {
    auth.signInWithCode.mockResolvedValueOnce({ ok: false, status: 403, code: "BANNED_USER" })
    await m.render(<SignInPanel returnTo="/" onSignedIn={() => {}} />)
    await type(m.container.querySelector("#signin-email"), "banned@company.test")
    await submit()
    await type(m.container.querySelector("#signin-code"), "12345678")
    await submit()
    expect(text()).toContain("This account is suspended")
    expect(text()).toContain("support@example.com")
  })

  it("opens straight on sign-up when asked", async () => {
    await m.render(<SignInPanel initialVariant="signup" returnTo="/" onSignedIn={() => {}} />)
    expect(text()).toContain("Create your account")
  })

  it("Continue with Google returns to the return path", async () => {
    await m.render(<SignInPanel returnTo="/projects" onSignedIn={() => {}} />)
    await click(byText("Continue with Google", "button"))
    expect(auth.signInWithGoogle).toHaveBeenCalledWith({ callbackURL: "/projects", errorCallbackURL: "/projects" })
  })

  it("no Google button when Google is not configured", async () => {
    config.googleEnabled = false
    await m.render(<SignInPanel returnTo="/" onSignedIn={() => {}} />)
    expect(byText("Continue with Google", "button")).toBeUndefined()
    expect(text()).not.toContain("Google")
    expect(m.container.querySelector("#signin-email")).not.toBeNull()
  })
})
