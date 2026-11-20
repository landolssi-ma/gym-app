"use client"

import { createContext, useContext } from "react"

import type { PublicConfig } from "./config"

const PublicConfigContext = createContext<PublicConfig | null>(null)

export function PublicConfigProvider({ value, children }: { value: PublicConfig; children: React.ReactNode }) {
  return <PublicConfigContext value={value}>{children}</PublicConfigContext>
}

export function usePublicConfig(): PublicConfig {
  const value = useContext(PublicConfigContext)
  if (!value) throw new Error("usePublicConfig needs PublicConfigProvider in the root layout")
  return value
}
