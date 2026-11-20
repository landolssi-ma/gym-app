import { t } from "@workspace/i18n"

import { AppShell } from "@/components/shell/app-shell"

// A placeholder: products replace it with their own dashboard.
export default function DashboardPage() {
  return (
    <AppShell title={t("app.dashboardTitle")}>
      <p className="text-muted-foreground">{t("app.dashboardBody")}</p>
    </AppShell>
  )
}
