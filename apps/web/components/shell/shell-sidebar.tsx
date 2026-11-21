"use client"

import { ADMIN_NAV, NAV, visibleItems } from "@/config/nav"
import { useMe } from "@/features/auth"

import { SidebarNav } from "./sidebar-nav"

// The one GET /api/me-dependent part of the sidebar; it suspends behind its own boundary so the
// wordmark above it paints at once.
export function ShellSidebar() {
  const { data } = useMe()
  return (
    <>
      <SidebarNav items={visibleItems(NAV)} />
      {data.isAdmin && (
        <div className="mt-auto">
          <SidebarNav items={[ADMIN_NAV]} />
        </div>
      )}
    </>
  )
}
