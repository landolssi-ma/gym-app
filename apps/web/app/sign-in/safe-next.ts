// Validates the sign-in `?next=` redirect target (the page's redirect and
// SignInForm's callbackURL/errorCallbackURL). Rejected, on the raw value and once more decoded
// (Next has already decoded searchParams once, so an encoded slash/backslash survives to here):
// anything not starting with exactly one "/" ("//host", "relative"), any backslash ("/\host"),
// colon (absolute URLs, "javascript:"), control character (browsers strip TAB/LF/CR, so
// "/<TAB>/host" becomes "//host"), and encoded "/", "\" or control characters. What passes is
// parsed against a sentinel origin and returned as the normalized pathname+search+hash, so the
// result is always a same-origin relative path. The input checks run before the URL parser
// collapses dot segments ("/.//host", "/a/..//host" and "/%2e%2e//host" all become "//host"), so
// the last guard checks the normalized output itself, the exact string that gets redirected to.
// Better Auth's trustedOrigins check stays a second layer.
const SENTINEL = "https://safe-next.invalid"
const UNSAFE = /^(?!\/)|^\/\/|[\\:\p{Cc}]|%(?:2f|5c|[01][\da-f]|7f)/iu

export function safeNext(next: string | string[] | undefined): string | null {
  if (typeof next !== "string") return null
  let decoded: string
  try {
    decoded = decodeURIComponent(next)
  } catch {
    return null
  }
  if (UNSAFE.test(next) || UNSAFE.test(decoded)) return null
  const url = new URL(next, SENTINEL)
  const out = url.pathname + url.search + url.hash
  return url.origin === SENTINEL && !/^\/[/\\]/.test(out) ? out : null
}
