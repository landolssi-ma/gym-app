"use client"

import { useMe } from "@/features/auth"

import { MobileNavSheet } from "./mobile-nav-sheet"
import { UserMenu } from "./user-menu"

// The one GET /api/me-dependent part of the header; TanStack Query dedupes it with the sidebar's.
export function ShellHeaderActions() {
  const { data } = useMe()
  return (
    <>
      <div className="hidden xl:block">
        <UserMenu name={data.user.name} email={data.user.email} image={data.user.image} isAdmin={data.isAdmin} />
      </div>
      <div className="xl:hidden">
        <MobileNavSheet me={data} />
      </div>
    </>
  )
}
