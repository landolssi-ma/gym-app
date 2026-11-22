# Design

## Context

The app already has: account-scoped DB queries via `requireUser`, a Hono router pattern (`packages/api`), Drizzle schema per area (`packages/db/src/schema/`), a TanStack Query + `apiFetch` service layer in `apps/web/features/`, and a seeded food library requirement. The gym profile (`gym_profiles`) supplies the data needed to compute BMR and TDEE. There is currently no food, meal plan or nutritional calculation logic anywhere in the codebase.

## Goals / Non-Goals

**Goals:**
- Three new Drizzle tables: `foods`, `meal_plans`, `meal_entries`.
- Seed migration with the initial food library (system foods, `user_id = null`).
- Hono router at `/api/nutrition` with sub-routes for needs, foods, meal plans and entries.
- Feature module `apps/web/features/nutrition/` following the existing feature convention.
- Shell page at `/nutrition` added to the sidebar nav.
- Real-time macro calculation runs client-side from the food's per-100g values and the entered weight; no extra API call per keystroke.

**Non-Goals:**
- Barcode scanning or third-party food database integration.
- Push notifications or reminders for meals.
- Weekly meal planning (the planner scope is one day at a time; week totals are read-only aggregations).
- Photo logging of meals.
- Exporting meal plans.

## Decisions

- **System foods use `user_id = null`.** A nullable `user_id` FK distinguishes seeded system foods from user-created ones. This keeps the library in a single table and lets the `GET /api/nutrition/foods` query return both with one SQL `OR` predicate.
  - Alternative: a separate `system_foods` table was rejected because it complicates the search query and duplicates the schema for no behavioral difference.

- **Nutritional needs computed server-side per request.** `GET /api/nutrition/needs` reads the gym profile and applies the Mifflin–St Jeor formula for BMR and a standard activity multiplier for TDEE. Caloric goal adjusts by ±500 kcal/day based on the goal enum. Macros split from the caloric goal (protein: 2 g/kg body weight; fat: 25–30% of TDEE; carbs: remainder).
  - Alternative: persisting computed values was rejected because the source (gym profile) can change and a stale cached value would silently mislead the user.

- **Meal plan row is implicit.** There is no explicit `meal_plans` table; each `meal_entries` row carries `user_id`, `date` (a date column), and `slot` (breakfast / lunch / dinner / snack_1 / snack_2). The "plan for a day" is the set of entries for that user+date.
  - Alternative: an explicit `meal_plans` row per user+date was rejected as unnecessary indirection — it adds a FK and a separate insert with no behavioral benefit for the current scope.

- **Real-time calculation is purely client-side.** The UI stores `caloriesPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g` for the selected food in component state. Weight changes recompute `(value / 100) × weight` on each keystroke. No debounce needed — it is a simple multiplication.
  - Alternative: server-side calculation per entry change was rejected as unnecessary latency for arithmetic.

- **Seed is a Drizzle migration file**, not the seed script. System foods are canonical data and must be present in every environment (dev, CI, production). Using a migration ensures they exist after `db:generate` + `db:migrate` without a separate seed step.
  - Alternative: `tooling/scripts/seed.ts` was rejected because seed is optional and skipped in CI/test runs.

- **Route path:** `/api/nutrition/*` with sub-paths `/needs`, `/foods`, `/foods/:id`, `/meal-entries`, `/meal-entries/:id`. Mounted beside `/api/gym-profile` in `packages/api/src/index.ts`.

## Risks / Trade-offs

- [Food deletion cascades to meal entries] → Documented in spec; the UI will warn before deleting a custom food that is referenced in any entry. The `ON DELETE CASCADE` FK in the DB handles the removal atomically.
- [Mifflin–St Jeor formula is an estimate] → Adequate for the stated goal; a UI note informs the user that values are estimates.
- [Meal entries table has no unique constraint on user+date+slot+food] → A user can add the same food twice to the same slot. This is intentional (e.g. two separate portions logged at different times) and matches how nutrition apps typically work.

## Migration Plan

1. Add `packages/db/src/schema/nutrition.ts` (foods + meal_entries tables).
2. Export from `packages/db/src/schema/index.ts`.
3. Run `pnpm db:generate` to produce a new migration file.
4. Add an SQL seed block inside the migration (or as a separate `INSERT` migration) for the initial system foods.
5. Run `pnpm db:reset` locally to apply; CI runs `pnpm test:db` against a container with all migrations applied.
