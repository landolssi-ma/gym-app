import { t } from "@workspace/i18n"
import { CalendarDaysIcon, FlameIcon, ListIcon } from "@workspace/ui/components/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { AppShell } from "@/components/shell/app-shell"
import { FoodLibrary } from "@/features/nutrition/components/food-library"
import { MealPlanner } from "@/features/nutrition/components/meal-planner"
import { NeedsPanel } from "@/features/nutrition/components/needs-panel"

export default function NutritionPage() {
  return (
    <AppShell title={t("nutrition.pageTitle")}>
      <Tabs defaultValue="needs" className="gap-6">
        <TabsList>
          <TabsTrigger value="needs">
            <FlameIcon className="size-4" />
            {t("nutrition.needsHeading")}
          </TabsTrigger>
          <TabsTrigger value="foods">
            <ListIcon className="size-4" />
            {t("nutrition.foodsHeading")}
          </TabsTrigger>
          <TabsTrigger value="planner">
            <CalendarDaysIcon className="size-4" />
            {t("nutrition.mealPlannerHeading")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="needs">
          <NeedsPanel />
        </TabsContent>
        <TabsContent value="foods">
          <FoodLibrary />
        </TabsContent>
        <TabsContent value="planner">
          <MealPlanner />
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
