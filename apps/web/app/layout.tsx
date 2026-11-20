import type { Metadata } from "next"
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google"

import "@workspace/ui/globals.css"

import { getConfig, getPublicConfig } from "@/lib/config"
import { PublicConfigProvider } from "@/lib/public-config"

const fontSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" })
const fontHeading = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" })
const fontMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" })

export function generateMetadata(): Metadata {
  return { metadataBase: new URL(getConfig().APP_ORIGIN) }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontHeading.variable} ${fontMono.variable} font-sans antialiased`}>
      <body>
        <PublicConfigProvider value={getPublicConfig()}>{children}</PublicConfigProvider>
      </body>
    </html>
  )
}
