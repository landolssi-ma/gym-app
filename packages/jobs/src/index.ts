import type { Context } from "hono"
import { Inngest, NonRetriableError, type InngestFunction } from "inngest"
import { serve } from "inngest/hono"

import type { EventName, Events } from "./events"

export type { EventName, Events }
export { NonRetriableError }

// isDev turns off signature verification; it comes only from INNGEST_DEV=1 locally.
export function createJobs(c: { appId: string; eventKey: string; signingKey: string; isDev: boolean }) {
  const inngest = new Inngest({ id: c.appId, eventKey: c.eventKey, signingKey: c.signingKey, isDev: c.isDev })
  return {
    define: inngest.createFunction,
    // `id` dedupes: the same id sent twice within 24 hours runs functions once.
    async send<N extends EventName>(name: N, data: Events[N], id: string) {
      await inngest.send({ id, name, data })
    },
    serve: (functions: InngestFunction.Any[]): ((c: Context) => Promise<Response>) => serve({ client: inngest, functions }),
  }
}
export type Jobs = ReturnType<typeof createJobs>
