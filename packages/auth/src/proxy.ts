import { getSessionCookie } from "better-auth/cookies"

// Cookie presence only, no network or DB read: proxy.ts uses it to send signed-out visitors to
// sign-in. A stale-but-present cookie passes here; the API's guards re-read the session from the
// database on every request and remain the real enforcement point.
export function hasSessionCookie(req: Request, cookiePrefix: string): boolean {
  return getSessionCookie(req, { cookiePrefix }) !== null
}

// The sign-in page's "already signed in" predicate: an authoritative get-session through the API.
// A request without a session cookie can never have a session, so it returns false before any
// dispatch. Fails closed: any non-2xx (including 400 duplicate_cookie) means "not signed in".
export async function isSignedIn(req: Request, cookiePrefix: string, api: (req: Request) => Promise<Response>): Promise<boolean> {
  if (!hasSessionCookie(req, cookiePrefix)) return false
  try {
    const res = await api(new Request(new URL("/api/auth/get-session", req.url), { headers: { cookie: req.headers.get("cookie") ?? "" } }))
    return res.ok && (await res.json()) !== null
  } catch {
    return false
  }
}
