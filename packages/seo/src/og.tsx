import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { ImageResponse } from "next/og"

// vinext's og-inline-fetch-assets plugin rewrites exactly this `fs.readFileSync(fileURLToPath(new
// URL(...)))` form (member call, not a bare readFileSync import) into an inline base64 literal at
// build time, so it works inside the Worker. fetch(new URL(...)) is the other supported form, but
// Node's fetch can't read file: URLs, which breaks it under Vitest.
const heading = fs.readFileSync(fileURLToPath(new URL("./assets/SpaceGrotesk-Bold.ttf", import.meta.url)))

// Satori can't read CSS variables: these mirror packages/ui globals.css tokens
// (--background, --foreground, --muted-foreground, --brand). Keep them in sync.
const TOKENS = { background: "#faf8f4", foreground: "#111714", muted: "#4a544f", brand: "#d4541a" }

export const OG_SIZE = { width: 1200, height: 630 }

export type OgImageInput = { eyebrow?: string; title: string; tag?: string }

export function renderOgImage({ eyebrow, title, tag }: OgImageInput) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: TOKENS.background,
          color: TOKENS.foreground,
          fontFamily: "Space Grotesk",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: TOKENS.brand, textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow ?? ""}</div>
        <div style={{ display: "flex", fontSize: 72, lineHeight: 1.1, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 28, color: TOKENS.muted }}>{tag ?? ""}</div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Space Grotesk", data: heading, weight: 700, style: "normal" }] },
  )
}
