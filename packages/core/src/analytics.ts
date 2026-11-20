// Server-side PostHog over fetch: no SDK, no client script, no cookies. The only module that knows the wire format.
export function createAnalytics(c: { key: string; host: string }) {
  const url = new URL("/i/v0/e/", c.host).href
  return {
    /** Returns the HTTP status, or 0 on a network error. Never throws: analytics must not break a request. */
    async capture(event: string, distinctId: string, props: Record<string, unknown> = {}): Promise<number> {
      // Person-identifying data never leaves.
      const { email: _email, ...properties } = props
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ api_key: c.key, event, distinct_id: distinctId, properties }),
        })
        return res.status
      } catch {
        return 0
      }
    },
  }
}
export type Analytics = ReturnType<typeof createAnalytics>
