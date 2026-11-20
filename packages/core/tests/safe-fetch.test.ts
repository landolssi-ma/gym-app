import { describe, expect, it } from "vitest"
import {
  assertPublicUrl,
  createDohResolve,
  safeFetch,
  type Resolve,
} from "../src/safe-fetch"

const deny = ["acme.test", "workers.dev"]
const dnsOf =
  (map: Record<string, string[]>): Resolve =>
  async (h) =>
    map[h] ?? []
const check = (url: string, resolve: Resolve = dnsOf({})) =>
  assertPublicUrl(url, { denyHostSuffixes: deny, resolve })
const reason = (r: string) => expect.objectContaining({ reason: r })

const BLOCKED = [
  "127.0.0.1",
  "10.0.0.1",
  "100.64.0.1",
  "169.254.169.254",
  "0.0.0.0",
  "::ffff:127.0.0.1",
  "64:ff9b::7f00:1",
  "2002:7f00:1::",
  "fc00::1",
  "fe80::1",
  "198.18.0.1",
  "192.0.0.1",
  "192.88.99.1",
  "224.0.0.1",
  "255.255.255.255",
]
const literal = (ip: string) =>
  ip.includes(":") ? `http://[${ip}]/` : `http://${ip}/`

describe("assertPublicUrl", () => {
  it.each(BLOCKED)(
    "refuses %s as a literal and as a DNS answer",
    async (ip) => {
      await expect(check(literal(ip))).rejects.toEqual(reason("private_ip"))
      await expect(
        check("http://evil.test/", dnsOf({ "evil.test": [ip] }))
      ).rejects.toEqual(reason("private_ip"))
    }
  )

  it.each(["8.8.8.8", "2606:4700::1111"])("allows %s", async (ip) => {
    await expect(check(literal(ip))).resolves.toBeInstanceOf(URL)
    await expect(
      check("http://ok.test/", dnsOf({ "ok.test": [ip] }))
    ).resolves.toBeInstanceOf(URL)
  })

  it("normalizes encoded IPs and rejects bad scheme, port and userinfo", async () => {
    await expect(check("http://2130706433/")).rejects.toEqual(
      reason("private_ip")
    )
    await expect(check("http://[::ffff:127.0.0.1]/")).rejects.toEqual(
      reason("private_ip")
    )
    await expect(check("ftp://x/")).rejects.toEqual(reason("protocol"))
    await expect(check("http://x:8080/")).rejects.toEqual(reason("port"))
    await expect(check("http://u:p@x/")).rejects.toEqual(reason("userinfo"))
    await expect(
      check("https://ok.test:443/", dnsOf({ "ok.test": ["8.8.8.8"] }))
    ).resolves.toBeInstanceOf(URL)
  })

  it("strips the trailing dot before resolving and before the own-host check", async () => {
    const seen: string[] = []
    await check(
      "http://example.com./",
      async (h) => (seen.push(h), ["8.8.8.8"])
    )
    expect(seen).toEqual(["example.com"])
    await expect(check("https://app.acme.test./x")).rejects.toEqual(
      reason("own_host")
    )
    await expect(check("https://acme.test/")).rejects.toEqual(
      reason("own_host")
    )
    await expect(check("https://foo.workers.dev/")).rejects.toEqual(
      reason("own_host")
    )
    await expect(
      assertPublicUrl("https://cdn.acme.test/", {
        denyHostSuffixes: ["ACME.test."],
        resolve: dnsOf({}),
      })
    ).rejects.toEqual(reason("own_host"))
    // a look-alike that only shares the suffix string is not own-host
    await expect(
      check("https://notacme.test/", dnsOf({ "notacme.test": ["8.8.8.8"] }))
    ).resolves.toBeInstanceOf(URL)
  })

  it("range edges are exact", async () => {
    for (const ip of ["100.63.255.255", "172.15.255.255", "192.167.255.255"])
      await expect(check(literal(ip))).resolves.toBeInstanceOf(URL)
    for (const ip of ["100.64.0.0", "172.16.0.0", "192.168.0.0"])
      await expect(check(literal(ip))).rejects.toEqual(reason("private_ip"))
  })

  it("fails closed on an empty answer or a resolver error", async () => {
    await expect(check("http://none.test/", async () => [])).rejects.toEqual(
      reason("dns_empty")
    )
    await expect(
      check("http://none.test/", async () =>
        Promise.reject(new Error("ENOTFOUND"))
      )
    ).rejects.toEqual(reason("dns_empty"))
  })

  it("refuses a mixed answer in either order", async () => {
    await expect(
      check("http://m.test/", async () => ["8.8.8.8", "10.0.0.1"])
    ).rejects.toEqual(reason("private_ip"))
    await expect(
      check("http://m.test/", async () => ["10.0.0.1", "8.8.8.8"])
    ).rejects.toEqual(reason("private_ip"))
  })
})

describe("createDohResolve", () => {
  const dohFetch = (byType: Record<number, { type?: number; data: string }[]>) =>
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)?.accept).toBe(
        "application/dns-json"
      )
      const type = Number(new URL(String(input)).searchParams.get("type"))
      const answer = (byType[type] ?? []).map((a) => ({
        type: a.type ?? type,
        data: a.data,
      }))
      return new Response(JSON.stringify({ Answer: answer }), { status: 200 })
    }) as typeof fetch

  it("merges A and AAAA answers", async () => {
    const resolve = createDohResolve(
      dohFetch({ 1: [{ data: "8.8.8.8" }], 28: [{ data: "2001:4860::1" }] })
    )
    await expect(resolve("ok.test")).resolves.toEqual([
      "8.8.8.8",
      "2001:4860::1",
    ])
  })

  it("ignores non-matching record types in the answer (e.g. CNAME)", async () => {
    const resolve = createDohResolve(
      dohFetch({ 1: [{ type: 5, data: "cname.test" }] })
    )
    await expect(resolve("cname.test")).resolves.toEqual([])
  })

  it("returns [] (not a throw) on a non-ok response or network error", async () => {
    const notOk = (async () =>
      new Response("", { status: 500 })) as typeof fetch
    await expect(createDohResolve(notOk)("x.test")).resolves.toEqual([])
    const throws = (async () => {
      throw new Error("network down")
    }) as typeof fetch
    await expect(createDohResolve(throws)("x.test")).resolves.toEqual([])
  })

  it("feeds assertPublicUrl end to end: dns_empty, private_ip and allow", async () => {
    await expect(
      assertPublicUrl("http://none.test/", {
        denyHostSuffixes: deny,
        resolve: createDohResolve(dohFetch({})),
      })
    ).rejects.toEqual(reason("dns_empty"))
    await expect(
      assertPublicUrl("http://evil.test/", {
        denyHostSuffixes: deny,
        resolve: createDohResolve(
          dohFetch({ 1: [{ data: "169.254.169.254" }] })
        ),
      })
    ).rejects.toEqual(reason("private_ip"))
    await expect(
      assertPublicUrl("http://ok.test/", {
        denyHostSuffixes: deny,
        resolve: createDohResolve(dohFetch({ 1: [{ data: "8.8.8.8" }] })),
      })
    ).resolves.toBeInstanceOf(URL)
  })
})

// --- safeFetch ---
const resolvePublic: Resolve = async () => ["8.8.8.8"]
const redirect = (to: string) =>
  new Response(null, { status: 302, headers: { location: to } })
const stream = (chunks: number[], headers: Record<string, string> = {}) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        for (const n of chunks) c.enqueue(new Uint8Array(n))
        c.close()
      },
    }),
    { status: 200, headers }
  )
const fakeFetch = (respond: (url: string, n: number) => Response) => {
  const calls: string[] = []
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.redirect).toBe("manual")
    calls.push(String(input))
    return respond(String(input), calls.length)
  }) as typeof fetch
  return Object.assign(f, { calls })
}
const sf = (url: string, f: typeof fetch, extra: object = {}) =>
  safeFetch(url, {
    denyHostSuffixes: deny,
    resolve: resolvePublic,
    fetch: f,
    ...extra,
  })

describe("safeFetch", () => {
  it("re-checks every redirect hop", async () => {
    await expect(
      sf(
        "https://shop.test/",
        fakeFetch(() => redirect("http://169.254.169.254/"))
      )
    ).rejects.toEqual(reason("private_ip"))
    await expect(
      sf(
        "https://shop.test/",
        fakeFetch(() => redirect("https://app.acme.test/x"))
      )
    ).rejects.toEqual(reason("own_host"))
  })

  it("allowHosts: refuses a host outside the list and a redirect leaving it", async () => {
    const allowHosts = ["api.okendo.io"]
    const ok = await sf("https://API.okendo.io./v1/x", fakeFetch(() => stream([1])), { allowHosts })
    expect(ok.status).toBe(200)
    await expect(
      sf("https://okendo.io/v1/x", fakeFetch(() => stream([1])), { allowHosts })
    ).rejects.toEqual(reason("host_not_allowed"))
    const leaving = fakeFetch(() => redirect("https://evil.test/"))
    await expect(
      sf("https://api.okendo.io/v1/x", leaving, { allowHosts })
    ).rejects.toEqual(reason("host_not_allowed"))
    expect(leaving.calls).toEqual(["https://api.okendo.io/v1/x"])
  })

  it("follows 5 redirects then 200, refuses a 6th, resolves relative Location", async () => {
    const five = fakeFetch((_u, n) =>
      n <= 5 ? redirect(`/hop${n}`) : stream([3])
    )
    const ok = await sf("https://shop.test/start", five)
    expect(ok.status).toBe(200)
    expect(ok.url).toBe("https://shop.test/hop5")
    expect(five.calls[1]).toBe("https://shop.test/hop1")
    await expect(
      sf(
        "https://shop.test/",
        fakeFetch((_u, n) => redirect(`/r${n}`))
      )
    ).rejects.toEqual(reason("too_many_redirects"))
    await expect(
      sf(
        "https://shop.test/",
        fakeFetch((_u, n) => (n <= 2 ? redirect(`/r${n}`) : stream([1]))),
        { maxRedirects: 1 }
      )
    ).rejects.toEqual(reason("too_many_redirects"))
  })

  it("caps the body by bytes read, not Content-Length", async () => {
    const max = 5 * 1024 * 1024
    const exact = await sf(
      "https://shop.test/",
      fakeFetch(() => stream([max - 1024, 1024]))
    )
    expect(exact.body.byteLength).toBe(max)
    await expect(
      sf(
        "https://shop.test/",
        fakeFetch(() => stream([max, 1]))
      )
    ).rejects.toEqual(reason("too_large"))
    await expect(
      sf(
        "https://shop.test/",
        fakeFetch(() =>
          stream(Array(6).fill(1024 * 1024), { "content-length": "100" })
        )
      )
    ).rejects.toEqual(reason("too_large"))
  })

  it("maps a timeout to FetchLimitError timeout", async () => {
    const hang = (async (_i: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, rej) =>
        init?.signal?.addEventListener("abort", () => rej(init.signal?.reason))
      )) as typeof fetch
    await expect(
      sf("https://shop.test/", hang, { timeoutMs: 10 })
    ).rejects.toEqual(reason("timeout"))
  })

  it("keeps no shared state across parallel calls", async () => {
    const [a, b] = await Promise.all([
      sf(
        "https://a.test/",
        fakeFetch(() => new Response("A"))
      ),
      sf(
        "https://b.test/",
        fakeFetch(() => new Response("B"))
      ),
    ])
    expect(new TextDecoder().decode(a.body)).toBe("A")
    expect(new TextDecoder().decode(b.body)).toBe("B")
  })
})
