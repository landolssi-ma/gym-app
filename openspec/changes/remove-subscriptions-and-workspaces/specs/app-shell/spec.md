# Spec Delta

## ADDED Requirements

### Requirement: The free gym app uses the Sage visual system
The app SHALL use the Sage, Beige, Ivory and Charcoal palette consistently across authentication, onboarding, signed-in pages, settings and dialogs.

#### Scenario: Primary action
- **WHEN** a primary action appears on authentication, onboarding or an app page
- **THEN** it uses the Sage brand token and readable contrast against Ivory or Beige surfaces

#### Scenario: Gender-neutral presentation
- **WHEN** the gym brand or fitness imagery is shown
- **THEN** the presentation is suitable for people of all genders and does not rely on female-only models or wording

#### Scenario: Responsive shell
- **WHEN** the app is opened on desktop or mobile
- **THEN** the shell, forms and cards keep readable spacing, visible controls and no horizontal overflow

### Requirement: The shell is account based
The signed-in shell SHALL identify the current account and SHALL NOT display workspace, team, plan or billing context.

#### Scenario: Account opens the app
- **WHEN** a signed-in account opens any app page
- **THEN** the shell shows account navigation and direct access to profile and security

#### Scenario: Account menu
- **WHEN** the account menu opens
- **THEN** it shows the user's name, email, avatar, profile, security and sign out

## REMOVED Requirements

### Requirement: Workspace switcher
**Reason**: Multiple workspaces are removed.
**Migration**: Remove organization switcher components and organization switching APIs.

### Requirement: User menu
**Reason**: The menu no longer includes workspace, team or billing destinations.
**Migration**: Replace the workspace-specific menu with an account-only menu.

### Requirement: Workspace settings
**Reason**: Workspace settings are removed.
**Migration**: Remove workspace name, logo and deletion settings pages.

### Requirement: Team page
**Reason**: Shared workspaces and team membership are removed.
**Migration**: Remove team pages and invitation/member APIs.

### Requirement: Billing page
**Reason**: Billing and subscriptions are removed.
**Migration**: Remove billing settings, plan controls and payment portal UI.

### Requirement: Suspended workspace state
**Reason**: Workspace suspension is removed.
**Migration**: Remove workspace suspension shell states.
