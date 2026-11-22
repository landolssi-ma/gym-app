# Tasks

## 1. Database schema

- [x] 1.1 Create `packages/db/src/schema/nutrition.ts` with two tables: `foods` (id, user_id nullable FK → user, name, preparation_state enum, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at) and `meal_entries` (id, user_id FK → user, date, slot enum, food_id FK → foods ON DELETE CASCADE, weight_g, created_at). Export both from `packages/db/src/schema/index.ts`. Verify: `pnpm typecheck` passes with no errors on the db package.

- [x] 1.2 Run `pnpm db:generate` to produce a new Drizzle migration. Add an `INSERT` block inside that migration (or as a second migration) seeding the initial system foods (user_id = null) for the four foods listed in the proposal plus a reasonable base set (at least 10 entries covering proteins, carbs and fats). Verify: migration file exists under `packages/db/drizzle/` and `pnpm db:reset` completes without errors.

## 2. API — nutritional needs

- [x] 2.1 Create `packages/api/src/routes/nutrition/needs.ts`: `GET /` reads the user's gym profile, computes BMR (Mifflin–St Jeor), TDEE (BMR × activity multiplier based on sessions_per_week), caloric goal (TDEE ± 500 kcal by goal), and macros (protein: 2 g/kg body weight; fat: 30% of TDEE calories / 9; carbs: remainder calories / 4). Returns `{ bmr, tdee, caloricGoal, proteinG, carbsG, fatG }`. Returns 404 `not_found` when the gym profile does not exist. Verify: `curl /api/nutrition/needs` with a valid session and seeded profile returns a JSON object with all six numeric fields.

## 3. API — food library

- [x] 3.1 Create `packages/api/src/routes/nutrition/foods.ts`: `GET /` accepts optional `?q=` query parameter and returns system foods (`user_id IS NULL`) plus the signed-in user's custom foods filtered by name. `POST /` validates name, preparation_state, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g and inserts with the user's id. Verify: `GET /api/nutrition/foods` returns at least the seeded system foods; `POST` with valid body inserts and returns the new food.

- [x] 3.2 Add `DELETE /api/nutrition/foods/:id` to `foods.ts`: looks up the food by id scoped to the signed-in user (refuses with 404 if not found or not owned by user), refuses with 403 if `user_id IS NULL` (system food), then deletes the food (cascade removes meal entries). Verify: deleting an owned custom food returns 200 and the food is gone from subsequent `GET`; deleting a system food returns 403.

## 4. API — meal entries

- [x] 4.1 Create `packages/api/src/routes/nutrition/meal-entries.ts`: `GET /` accepts required `?date=YYYY-MM-DD` and returns all meal entries for that user+date, each including the food's nutritional values per 100 g. `POST /` validates food_id, date, slot, weight_g (> 0); verifies the food belongs to the user or is a system food; inserts the entry. Verify: `POST` then `GET ?date=` returns the inserted entry with food data.

- [x] 4.2 Add `DELETE /api/nutrition/meal-entries/:id`: scopes lookup to the signed-in user, returns 404 if not found, then deletes. Verify: `DELETE` returns 200 and the entry is absent from subsequent `GET`.

## 5. API — router registration and route table

- [x] 5.1 Create `packages/api/src/routes/nutrition/index.ts` that assembles the needs, foods and meal-entries sub-routers into a single Hono router. Mount it in `packages/api/src/index.ts` at `/api/nutrition`. Verify: `pnpm typecheck` passes on the api package.

- [x] 5.2 Add all new nutrition routes to `packages/api/tests/route-table.test.ts` as session-protected (not public, not signature-exempt). Verify: `pnpm test` passes, including the route-table suite.

## 6. i18n

- [x] 6.1 Add `nav.nutrition` and all `nutrition.*` keys to `packages/i18n/src/en.json`: page title, section headings (needs, foods, meal planner), meal slot labels (breakfast, lunch, dinner, snack1, snack2), field labels, action labels (add food, delete, recalculate), unit labels (kcal, g), placeholder and empty-state strings. Verify: `pnpm typecheck` passes (i18n type generation will fail on a missing key).

## 7. Feature module

- [x] 7.1 Create `apps/web/features/nutrition/services.ts` with typed `hc` client calls for all nutrition API endpoints (needs, foods search, food add/delete, meal entries get/post/delete). Create `apps/web/features/nutrition/hooks.ts` with TanStack Query hooks: `useNutritionNeeds()`, `useFoods(query)`, `useMealEntries(date)` and their mutation hooks. Create `apps/web/features/nutrition/index.ts` exporting the public surface. Verify: `pnpm typecheck` passes on the web package.

## 8. UI — nutritional needs panel

- [x] 8.1 Create `apps/web/features/nutrition/components/needs-panel.tsx`: uses `useNutritionNeeds()`, shows a grid of six stat tiles (BMR, TDEE, caloric goal, protein, carbs, fat) each with value and unit. Shows a "Complete your profile" prompt when the hook returns 404. Includes a "Recalculate" button that invalidates the query. Wrap in `FeatureBoundary` with a skeleton. Verify: visible at `/nutrition` for a user with a complete gym profile; skeleton shows during load; profile prompt shows for a user without a profile.

## 9. UI — food library panel

- [x] 9.1 Create `apps/web/features/nutrition/components/food-library.tsx`: debounced search input, results list showing name, prep state and macros per 100 g, "Add custom food" button that opens a form (name, prep state, calories, protein, carbs, fat). Uses `useFoods(query)` and the add/delete mutations. System foods show without a delete button; custom foods show a delete button that opens a `ConfirmDeleteDialog`. Wrap in `FeatureBoundary`. Verify: search filters results; add form creates a food visible in results; delete removes a custom food.

## 10. UI — meal planner panel

- [x] 10.1 Create `apps/web/features/nutrition/components/meal-planner.tsx`: date picker (default today), five slot sections (breakfast, lunch, dinner, snack 1, snack 2). Each slot shows its entries with real-time calculated macros (calories, protein, carbs, fat) derived from stored per-100g values × weight_g / 100 in component state. Slot footer shows slot totals. Day footer shows day totals. Uses `useMealEntries(date)` and add/delete mutations. Each slot has an "Add food" button that opens a food search + weight input. Wrap each slot in `FeatureBoundary`. Verify: adding an entry shows calculated macros; changing weight updates totals immediately; removing an entry updates totals.

## 11. Shell page and navigation

- [x] 11.1 Create `apps/web/app/(app)/(shell)/nutrition/page.tsx` that renders inside `AppShell` (title from `t("nutrition.pageTitle")`), composed of `NeedsPanel`, `FoodLibrary` and `MealPlanner`. Add `{ href: "/nutrition", label: "nav.nutrition", Icon: SaladIcon }` (or the nearest available icon from `@workspace/ui/components/icons`) to `NAV` in `apps/web/config/nav.ts`, below the Dashboard entry. Verify: Nutrition appears in the sidebar; navigating to `/nutrition` renders the page inside the shell.

## 12. Final verification

- [x] 12.1 Run `pnpm lint` and `pnpm typecheck` with zero errors. Verify: both pass.

- [x] 12.2 Run `pnpm test` (unit + route-table). Verify: all tests pass, including the route-table test that covers the new nutrition routes as session-protected.

## Workflow follow-up

- When implementation is complete and all tasks are verified, run `/openspec-verify-change` to confirm the change matches its specs.
- Then run `/openspec-archive-change` to sync specs and archive the change.
