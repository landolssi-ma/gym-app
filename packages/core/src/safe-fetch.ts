// SSRF guard. Every server-side fetch of a user-supplied URL goes through safeFetch.
// Residual risk: Workers cannot pin the resolved IP, so DNS can rebind
// between this check and the connect; every redirect hop is re-checked to narrow the window.
import ipaddr from "ipaddr.js"

export const SAFE_FETCH_LIMITS = {
  maxRedirects: 5,
  maxBytes: 5 * 1024 * 1024,
  timeoutMs: 10_000,
} as const

export class SsrfError extends Error {
  reason:
    | "protocol"
    | "port"
    | "userinfo"
    | "own_host"
    | "host_not_allowed"
    | "private_ip"
    | "dns_empty"
    | "too_many_redirects"
  constructor(reason: SsrfError["reason"]) {
    super(`blocked url: ${reason}`)
    this.name = "SsrfError"
    this.reason = reason
  }
}

export class FetchLimitError extends Error {
  reason: "too_large" | "timeout"
  constructor(reason: FetchLimitError["reason"]) {
    super(`fetch limit: ${reason}`)
    this.name = "FetchLimitError"
    this.reason = reason
  }
}

export type Resolve = (host: string) => Promise<string[]>
export type SafeFetchOptions = {
  denyHostSuffixes: string[]
  // Exact hosts every hop must be on (for example a partner API), on top of the public-IP rule.
  allowHosts?: string[]
  resolve?: Resolve
  fetch?: typeof fetch
  maxRedirects?: number
  maxBytes?: number
  timeoutMs?: number
  accept?: string
}

// lookup() is unavailable on Workers; node:dns resolve4/6 silently return [] under
// workerd's nodejs_compat (observed: every external host fails dns_empty), so the
// default resolver queries DNS over HTTPS with plain fetch instead — identical
// behavior under Node, local workerd and deployed Workers.
const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query"
type DohAnswer = { type: number; data: string }
type DohResponse = { Answer?: DohAnswer[] }

export const createDohResolve =
  (doFetch: typeof fetch = fetch): Resolve =>
  async (host) => {
    const query = async (type: 1 | 28) => {
      const res = await doFetch(
        `${DOH_ENDPOINT}?name=${encodeURIComponent(host)}&type=${type}`,
        { headers: { accept: "application/dns-json" } }
      )
      if (!res.ok) return []
      const json = (await res.json()) as DohResponse
      return (json.Answer ?? [])
        .filter((a) => a.type === type)
        .map((a) => a.data)
    }
    const [a, b] = await Promise.all([
      query(1).catch(() => []),
      query(28).catch(() => []),
    ])
    return [...a, ...b]
  }

const dnsResolve: Resolve = createDohResolve()

const unicast = (ip: string) =>
  ipaddr.isValid(ip) && ipaddr.parse(ip).range() === "unicast"
const bare = (h: string) => h.toLowerCase().replace(/\.$/, "")

export async function assertPublicUrl(
  raw: string | URL,
  opts: { denyHostSuffixes: string[]; allowHosts?: string[]; resolve?: Resolve }
) {
  const u = new URL(raw)
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new SsrfError("protocol")
  if (!["", "80", "443"].includes(u.port)) throw new SsrfError("port")
  if (u.username || u.password) throw new SsrfError("userinfo")
  const host = bare(u.hostname).replace(/^\[|\]$/g, "")
  if (
    opts.denyHostSuffixes
      .map(bare)
      .some((s) => host === s || host.endsWith("." + s))
  )
    throw new SsrfError("own_host")
  if (opts.allowHosts && !opts.allowHosts.map(bare).includes(host))
    throw new SsrfError("host_not_allowed")
  const ips = ipaddr.isValid(host)
    ? [host]
    : await (opts.resolve ?? dnsResolve)(host).catch(() => [])
  if (ips.length === 0) throw new SsrfError("dns_empty")
  if (!ips.every(unicast)) throw new SsrfError("private_ip")
  return u
}

export async function safeFetch(raw: string, opts: SafeFetchOptions) {
  // ?? not spread: an explicit `undefined` must not disable a limit
  const maxRedirects = opts.maxRedirects ?? SAFE_FETCH_LIMITS.maxRedirects
  const maxBytes = opts.maxBytes ?? SAFE_FETCH_LIMITS.maxBytes
  const signal = AbortSignal.timeout(
    opts.timeoutMs ?? SAFE_FETCH_LIMITS.timeoutMs
  )
  let url = new URL(raw)
  try {
    for (let hop = 0; ; hop++) {
      url = await assertPublicUrl(url, opts)
      const res = await (opts.fetch ?? fetch)(url, {
        redirect: "manual",
        signal,
        headers: opts.accept ? { accept: opts.accept } : undefined,
      })
      const location = res.headers.get("location")
      if ([301, 302, 303, 307, 308].includes(res.status) && location) {
        res.body?.cancel().catch(() => {})
        if (hop >= maxRedirects) throw new SsrfError("too_many_redirects")
        url = new URL(location, url)
        continue
      }
      return {
        url: url.href,
        status: res.status,
        headers: res.headers,
        body: await readCapped(res.body, maxBytes),
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError")
      throw new FetchLimitError("timeout")
    throw e
  }
}

// Counts bytes actually read; Content-Length is attacker-controlled and ignored.
async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
) {
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = body?.getReader()
  for (let r; reader && !(r = await reader.read()).done;) {
    size += r.value.byteLength
    if (size > maxBytes) {
      reader.cancel().catch(() => {})
      throw new FetchLimitError("too_large")
    }
    chunks.push(r.value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}
