# Proposal

## Why

The app personalises training for each user but offers no way to track nutrition, which is the other half of any physique goal. Without caloric and macro visibility, users cannot act on their goal (muscle gain, fat loss, recomposition) in a coherent way.

## What Changes

- Add a **Nutrition** page to the signed-in shell, linked from the sidebar under Dashboard.
- **A. Nutritional needs** — compute and display BMR, TDEE, caloric goal and daily macro targets (protein, carbs, fat) derived from the user's gym profile. The user can recalculate when their weight or activity level changes.
- **B. Food library** — a searchable list of foods with nutritional values per 100 g (calories, protein, carbs, fat). Ships with a seed of common foods. Users can add their own custom foods. Each food entry distinguishes its preparation state (raw, cooked, drained) where relevant.
- **C. Meal planner** — a daily calendar with five named meal slots (breakfast, lunch, dinner, snack 1, snack 2). Each slot accepts multiple food entries with a specified weight in grams.
- **D. Nutritional calculator** — inline, reactive: recalculates macros and calories for a food entry immediately on weight change, then sums all entries to show per-meal, per-day and per-week totals.

## Capabilities

### New Capabilities

- `nutrition`: Nutritional needs display, food library with custom entries, daily meal planning, and real-time macro calculation and aggregation.

### Modified Capabilities

_(none — adding a nav item and a new shell page is covered by the existing app-shell spec.)_

## Impact

- **DB:** Three new tables — `foods` (library), `meal_plans` (daily slots), `meal_entries` (food + weight per slot). Seed migration for the initial food library.
- **API:** New Hono router at `/api/nutrition` with routes for nutritional needs, food CRUD, meal plan read/write and meal entry CRUD. All routes require `requireUser`; food creation and meal writes also use `forbidWhileImpersonating`.
- **UI:** New feature `nutrition` in `apps/web/features/nutrition/`. New shell page at `apps/web/app/(app)/(shell)/nutrition/`. Nav entry added to `apps/web/config/nav.ts`.
- **i18n:** New `nutrition.*` and `nav.nutrition` keys in `en.json`.
- **No breaking changes** to existing routes, schema or UI.
