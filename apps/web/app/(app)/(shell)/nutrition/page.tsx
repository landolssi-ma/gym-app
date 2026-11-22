import { t } from "@workspace/i18n"
import { CalendarDaysIcon, ChartColumnIcon, LeafIcon, ZapIcon } from "@workspace/ui/components/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { AppShell } from "@/components/shell/app-shell"
import { NutritionCalculator } from "@/features/nutrition/components/calculator"
import { FoodLibrary } from "@/features/nutrition/components/food-library"
import { MealPlanner } from "@/features/nutrition/components/meal-planner"
import { NeedsPanel } from "@/features/nutrition/components/needs-panel"

export default function NutritionPage() {
  return (
    <AppShell title={t("nutrition.pageTitle")}>
      <Tabs defaultValue="needs" className="gap-6">
        <TabsList className="bg-muted border-0">
          <TabsTrigger value="needs">
            <ChartColumnIcon className="size-4" />
            {t("nutrition.needsHeading")}
          </TabsTrigger>
          <TabsTrigger value="foods">
            <LeafIcon className="size-4" />
            {t("nutrition.foodsHeading")}
          </TabsTrigger>
          <TabsTrigger value="planner">
            <CalendarDaysIcon className="size-4" />
            {t("nutrition.mealPlannerHeading")}
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <ZapIcon className="size-4" />
            {t("nutrition.calculatorHeading")}
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
        <TabsContent value="calculator">
          <NutritionCalculator />
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
