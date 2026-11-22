import { t } from "@workspace/i18n"

import { AppShell } from "@/components/shell/app-shell"
import { FoodLibrary } from "@/features/nutrition/components/food-library"
import { MealPlanner } from "@/features/nutrition/components/meal-planner"
import { NeedsPanel } from "@/features/nutrition/components/needs-panel"

export default function NutritionPage() {
  return (
    <AppShell title={t("nutrition.pageTitle")}>
      <div className="space-y-6">
        <NeedsPanel />
        <FoodLibrary />
        <MealPlanner />
      </div>
    </AppShell>
  )
}
