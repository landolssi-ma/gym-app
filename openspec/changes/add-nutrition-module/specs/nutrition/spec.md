# Spec Delta

## Purpose

Tracks nutritional needs, food data and daily meal plans for a signed-in user so they can align their diet with their physique goal.

## ADDED Requirements

### Requirement: Nutritional needs display

The nutrition page SHALL display the user's computed nutritional needs: basal metabolic rate (BMR), estimated total daily energy expenditure (TDEE), daily caloric goal, and daily targets for protein, carbohydrates and fat in grams. All values SHALL be derived from the user's gym profile (sex, age, height, weight, sport level, goal and sessions per week). If the gym profile is incomplete the page SHALL prompt the user to complete it first.

#### Scenario: Needs shown for a complete profile
- **WHEN** a signed-in user with a complete gym profile opens the Nutrition page
- **THEN** BMR, TDEE, caloric goal, protein, carbs and fat targets are displayed, each as a numeric value with its unit

#### Scenario: Incomplete profile
- **WHEN** a signed-in user without a complete gym profile opens the Nutrition page
- **THEN** a prompt is shown directing them to complete their gym profile before nutritional needs can be computed

### Requirement: Recalculate nutritional needs

The user SHALL be able to trigger a recalculation of their nutritional needs at any time. The recalculation SHALL use the current values from the gym profile at the time the request is made.

#### Scenario: Recalculate after weight update
- **WHEN** the user updates their weight in the gym profile settings and then recalculates needs on the Nutrition page
- **THEN** the displayed values reflect the updated weight

### Requirement: Food library — read

The nutrition page SHALL provide a searchable library of foods. Each food entry SHALL expose at minimum: name, preparation state (raw, cooked or drained), and nutritional values per 100 g (calories, protein, carbohydrates, fat). The library SHALL be searchable by name. Results SHALL include both seeded system foods and the signed-in user's own custom foods.

#### Scenario: Search returns matching foods
- **WHEN** the user searches for a term that matches one or more food names
- **THEN** only foods whose name contains the search term (case-insensitive) are shown, including both system and custom foods belonging to the user

#### Scenario: Empty search shows all foods
- **WHEN** the search field is empty
- **THEN** all system foods and the user's custom foods are listed

### Requirement: Food library — custom foods

A signed-in user SHALL be able to add a custom food entry by supplying a name, preparation state, calories per 100 g, protein per 100 g, carbohydrates per 100 g and fat per 100 g. The user SHALL be able to delete their own custom foods. A user SHALL NOT be able to edit or delete system foods.

#### Scenario: Add custom food
- **WHEN** the user submits a valid new food form
- **THEN** the food is saved and appears in the food library search results

#### Scenario: Delete custom food
- **WHEN** the user deletes their own custom food
- **THEN** the food is removed from the library; any existing meal entries that referenced it are also removed

#### Scenario: Cannot modify system food
- **WHEN** the user attempts to edit or delete a system food
- **THEN** the action is refused (403)

### Requirement: Meal plan — daily slots

A signed-in user SHALL have a meal plan for each calendar day. Each day's plan SHALL contain five named slots: breakfast, lunch, dinner, snack 1 and snack 2. Each slot SHALL accept zero or more food entries.

#### Scenario: Day plan is empty by default
- **WHEN** the user opens the Nutrition page for a day with no entries
- **THEN** all five slots are shown empty

#### Scenario: Navigate between days
- **WHEN** the user selects a different date
- **THEN** the five slots show the food entries saved for that date

### Requirement: Meal entry — add and remove

A signed-in user SHALL be able to add a food entry to a meal slot by selecting a food from the library and specifying a weight in grams. The user SHALL be able to remove an entry from a slot.

#### Scenario: Add entry to slot
- **WHEN** the user selects a food and enters a weight greater than zero and saves
- **THEN** the entry appears in the slot with its calculated calories and macros for the specified weight

#### Scenario: Remove entry from slot
- **WHEN** the user removes a food entry from a slot
- **THEN** the entry is deleted and slot and day totals are recalculated

### Requirement: Real-time nutritional calculation

For each food entry in a slot, the system SHALL calculate and display calories, protein, carbohydrates and fat for the entered weight immediately when the weight changes. The calculation SHALL use the formula: `(value_per_100g × weight_g) / 100`.

#### Scenario: Weight change triggers recalculation
- **WHEN** the user changes the weight of a food entry
- **THEN** the calories and macros for that entry update immediately without a page reload

### Requirement: Nutritional totals

The system SHALL aggregate calculated values across all entries in a slot to show slot totals, and across all slots in a day to show day totals, and across all days in a week to show week totals.

#### Scenario: Slot total
- **WHEN** a meal slot contains two food entries
- **THEN** the slot total for calories equals the sum of each entry's calculated calories

#### Scenario: Day total
- **WHEN** at least one slot on a day has entries
- **THEN** the day total for each macro equals the sum of all slot totals for that macro

#### Scenario: Week total
- **WHEN** at least one day in the current week has entries
- **THEN** the week total for each macro equals the sum of day totals for the days that have entries

### Requirement: Account ownership

All food library reads and writes SHALL be scoped to the signed-in user. Custom foods created by one user SHALL NOT be visible to or modifiable by another. Meal plans and entries SHALL be owned by the signed-in user; another user's ids SHALL answer 404.
