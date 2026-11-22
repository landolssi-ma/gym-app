import type { Messages } from "@workspace/i18n"
import { FlameIcon, LayoutDashboardIcon, SettingsIcon, ShieldIcon, UserIcon } from "@workspace/ui/components/icons"

export type NavItem = {
  href: string
  label: `nav.${keyof Messages["nav"]}`
  Icon: React.ComponentType<{ className?: string }>
}

// The sidebar and the mobile sheet. A product's own pages go here.
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", Icon: LayoutDashboardIcon },
  { href: "/nutrition", label: "nav.nutrition", Icon: FlameIcon },
]

// The user menu, and the settings block of the mobile sheet.
export const SETTINGS_NAV: NavItem[] = [
  { href: "/settings/profile", label: "nav.profile", Icon: UserIcon },
  { href: "/settings/security", label: "nav.security", Icon: ShieldIcon },
]

export const ADMIN_NAV: NavItem = { href: "/admin", label: "nav.admin", Icon: ShieldIcon }

export const visibleItems = (items: NavItem[]) => items
