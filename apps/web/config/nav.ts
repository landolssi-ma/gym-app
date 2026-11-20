import type { Feature } from "@workspace/billing"
import type { OrgRole } from "@workspace/auth"
import type { Messages } from "@workspace/i18n"
import { CreditCardIcon, FolderIcon, LayoutDashboardIcon, SettingsIcon, ShieldIcon, UserIcon, UsersIcon } from "@workspace/ui/components/icons"

export type NavItem = {
  href: string
  label: `nav.${keyof Messages["nav"]}`
  Icon: React.ComponentType<{ className?: string }>
  // Shown only to these workspace roles, or only on plans with this feature. Cosmetic: the API
  // checks the same thing on every request.
  roles?: OrgRole[]
  feature?: Feature
}

// The sidebar and the mobile sheet. A product's own pages go here.
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", Icon: LayoutDashboardIcon },
  { href: "/projects", label: "nav.projects", Icon: FolderIcon },
  { href: "/team", label: "nav.team", Icon: UsersIcon },
]

// The user menu, and the settings block of the mobile sheet.
export const SETTINGS_NAV: NavItem[] = [
  { href: "/settings/profile", label: "nav.profile", Icon: UserIcon },
  { href: "/settings/security", label: "nav.security", Icon: ShieldIcon },
  { href: "/settings/workspace", label: "nav.workspace", Icon: SettingsIcon },
  { href: "/billing", label: "nav.billing", Icon: CreditCardIcon },
]

export const ADMIN_NAV: NavItem = { href: "/admin", label: "nav.admin", Icon: ShieldIcon }

export const visibleItems = (items: NavItem[], ctx: { role: OrgRole; features: readonly string[] }) =>
  items.filter((i) => (!i.roles || i.roles.includes(ctx.role)) && (!i.feature || ctx.features.includes(i.feature)))
