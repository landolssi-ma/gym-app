import { createAuthClient } from "better-auth/client"
import { adminClient, emailOTPClient } from "better-auth/client/plugins"

const authClient = createAuthClient({
  plugins: [emailOTPClient(), adminClient()],
  // Resolve fetch per call rather than once at module load.
  fetchOptions: { customFetchImpl: (input, init) => globalThis.fetch(input, init) },
})

// code is Better Auth's error code (INVALID_OTP, TOO_MANY_ATTEMPTS, PASSWORD_COMPROMISED,
// EMAIL_NOT_VERIFIED, BANNED_USER, ...); the sign-in UI maps it to a message.
export type Result = { ok: boolean; status?: number; code?: string }

async function toResult(call: () => Promise<{ error?: { status?: number; code?: string } | null }>): Promise<Result> {
  try {
    const res = await call()
    return res.error ? { ok: false, status: res.error.status, code: res.error.code } : { ok: true }
  } catch {
    return { ok: false }
  }
}

export function signInWithGoogle(opts: { callbackURL: string; errorCallbackURL?: string }): Promise<Result> {
  return toResult(() => authClient.signIn.social({ provider: "google", ...opts }))
}

// An 8-digit code by email; the code then signs in (or signs up) the address.
export function sendSignInCode(email: string): Promise<Result> {
  return toResult(() => authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }))
}

export function signInWithCode(email: string, code: string): Promise<Result> {
  // name only applies when the code creates the account.
  return toResult(() => authClient.signIn.emailOtp({ email, otp: code, name: email.split("@")[0]! }))
}

// Refused with EMAIL_NOT_VERIFIED until the email is verified; Better Auth then resends the link,
// which signs in and lands on callbackURL.
export function signInWithPassword(email: string, password: string, callbackURL: string): Promise<Result> {
  return toResult(() => authClient.signIn.email({ email, password, callbackURL }))
}

// Sends a verification link and does not sign in; the link signs the person in.
export function signUpWithPassword(email: string, password: string, callbackURL: string): Promise<Result> {
  return toResult(() => authClient.signUp.email({ email, password, name: email.split("@")[0]!, callbackURL }))
}

export function resendVerification(email: string, callbackURL: string): Promise<Result> {
  return toResult(() => authClient.sendVerificationEmail({ email, callbackURL }))
}

export function requestPasswordReset(email: string, redirectTo: string): Promise<Result> {
  return toResult(() => authClient.requestPasswordReset({ email, redirectTo }))
}

export function resetPassword(token: string, newPassword: string): Promise<Result> {
  return toResult(() => authClient.resetPassword({ token, newPassword }))
}

export function changePassword(currentPassword: string, newPassword: string): Promise<Result> {
  return toResult(() => authClient.changePassword({ currentPassword, newPassword }))
}

// The account keeps its current email until the link sent to the new address is opened.
export function changeEmail(newEmail: string, callbackURL: string): Promise<Result> {
  return toResult(() => authClient.changeEmail({ newEmail, callbackURL }))
}

export function updateName(name: string): Promise<Result> {
  return toResult(() => authClient.updateUser({ name }))
}

export async function signOut(): Promise<void> {
  try {
    await authClient.signOut()
  } catch {
    // Best-effort: the next request without a valid session is treated as signed out anyway.
  }
}

export function startImpersonation(userId: string): Promise<Result> {
  return toResult(() => authClient.admin.impersonateUser({ userId }))
}

export function stopImpersonation(): Promise<Result> {
  return toResult(() => authClient.admin.stopImpersonating())
}
