# Proposal

## Why

The app needs to collect the information required to personalize a gym experience before the user starts using the product. It should no longer expose the starter "Projects" reference module, which does not belong to the gym domain.

## What Changes

- Add a required first-launch gym profile for every signed-in user.
- Collect sex, age, height, current weight, waist circumference, optional hip circumference, activity level and fitness goal.
- Require the number of training sessions per week.
- Require completion of this profile before the user can enter the normal app shell.
- Let the user view and update their completed profile from the existing profile settings page.
- **BREAKING:** Remove the starter Projects module, including its navigation item, route, API, database table, UI feature and tests.

## Capabilities

### New Capabilities
- `gym-profile`: Durable ownership and validation of a signed-in user's personal gym profile and first-launch completion state.

### Modified Capabilities
- `app-shell`: Profile settings gains gym profile fields, and the shell is not entered until the first-launch gym profile is complete.
- `onboarding-funnel`: After sign-in, the gym profile becomes the first unfinished step; it replaces the generic starter survey in the sign-in destination flow.

## Impact

- Database: add account-owned gym profile fields and remove the `projects` table.
- API: add profile read/update and completion behavior; remove `/api/projects`.
- Web: add the first-launch profile flow and editable profile form; remove `/projects` and the Projects navigation item.
- Translations: add gym profile labels and validation text; remove Projects strings.
- Tests: cover required and optional fields, update behavior, redirects and removal of the starter module.
