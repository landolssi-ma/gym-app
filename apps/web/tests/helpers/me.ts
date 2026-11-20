import type { Me } from "@/features/auth"

export function meBody(over: Partial<Me> = {}): Me {
  const org = { id: "org_1", name: "Acme", logo: null, role: "owner" as const, suspended: false, noTrial: false }
  return {
    user: { id: "u1", name: "Ada Lovelace", email: "ada@example.com", image: null },
    activeOrganization: org,
    organizations: [org, { ...org, id: "org_2", name: "Second", role: "member" as const }],
    orgRole: "owner",
    subscription: { plan: "pro", status: "active" },
    live: true,
    features: ["export"],
    trialEligible: false,
    isAdmin: false,
    impersonating: false,
    ...over,
  } as Me
}
