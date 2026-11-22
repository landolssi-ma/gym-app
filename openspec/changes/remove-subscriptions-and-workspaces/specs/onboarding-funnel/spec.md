# Spec Delta

## ADDED Requirements

### Requirement: Gym profile is the only first-launch step
After authentication, the system SHALL send a user without a completed gym profile to the gym profile form once. After completion, it SHALL send the user to the requested app path or dashboard.

#### Scenario: Brand new user
- **WHEN** a new account signs in without a completed gym profile
- **THEN** they complete the gym profile before normal app pages open

#### Scenario: Profile complete
- **WHEN** a signed-in user with a completed gym profile opens the app
- **THEN** they reach the requested app path or dashboard without a subscription or workspace step

#### Scenario: Legacy workspace survey
- **WHEN** an account reaches sign-in after workspace survey removal
- **THEN** no workspace survey is shown

## REMOVED Requirements

### Requirement: Landing call to action leads to sign-up
**Reason**: The landing call to action leads directly to authentication and then the product.
**Migration**: Remove billing-aware next-step checks from landing actions.

### Requirement: After sign-in the user goes to their next step
**Reason**: There is no survey or plans step after sign-in.
**Migration**: Send authenticated users to the return path or dashboard.

### Requirement: Survey
**Reason**: Workspace survey onboarding is removed.
**Migration**: Remove survey storage, routes and pages.

### Requirement: Plans page
**Reason**: Plans and checkout are removed.
**Migration**: Remove plans pages and checkout buttons.

### Requirement: Checkout success waits for activation
**Reason**: There is no provider checkout or activation.
**Migration**: Remove checkout success waiting pages.

### Requirement: Abandoned checkout returns to plans
**Reason**: Abandoned provider checkout no longer exists.
**Migration**: Remove checkout cancel redirect behavior.

### Requirement: Workspaces without a subscription are sent to plans
**Reason**: Workspaces and subscriptions are removed.
**Migration**: Remove subscription redirect middleware.

### Requirement: Invited users join without the funnel
**Reason**: Workspace invitations are removed.
**Migration**: Remove invitation-based onboarding.
