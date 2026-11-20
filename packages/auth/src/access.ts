import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/organization/access"

// Workspace roles, defined in this one file. The platform admin is a separate concept
// (user.role = "admin") and is never a workspace role.
// - owner: everything, including billing, ownership transfer and workspace deletion
// - admin: members, invitations, workspace name and logo
// - member: uses the product
export const ac = createAccessControl({ ...defaultStatements, billing: ["manage"] } as const)

export const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  billing: ["manage"],
})

export const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  billing: [],
})

export const member = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  billing: [],
})

export const ORG_ROLES = ["owner", "admin", "member"] as const
export type OrgRole = (typeof ORG_ROLES)[number]
