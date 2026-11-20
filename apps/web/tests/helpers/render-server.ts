import type { ReactNode } from "react"
import { prerenderToNodeStream } from "react-dom/static"

// renderToStaticMarkup can't render async Server Components (pages fetch CMS content); prerender waits for them.
export async function renderServer(node: ReactNode) {
  const { prelude } = await prerenderToNodeStream(node)
  let html = ""
  for await (const chunk of prelude) html += chunk
  return html
}
