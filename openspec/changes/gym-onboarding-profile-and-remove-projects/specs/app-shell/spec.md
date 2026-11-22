# Spec Delta

## MODIFIED Requirements

### Requirement: Profile settings
The profile page SHALL let a user change their name and avatar, start an email change, and view or update their gym profile.

#### Scenario: Name changed
- **WHEN** a user saves a new name
- **THEN** the shell and user menu show the new name

#### Scenario: Gym profile updated
- **WHEN** a user submits valid gym profile changes
- **THEN** the saved profile values are shown the next time the profile page opens

## ADDED Requirements

### Requirement: Gym profile gate
The signed-in shell SHALL send a user with no completed gym profile to the first-launch profile form before rendering normal app pages.

#### Scenario: Incomplete profile opens dashboard
- **WHEN** a signed-in user with an incomplete profile opens `/dashboard`
- **THEN** the system sends the user to the gym profile form

#### Scenario: Completed profile opens requested page
- **WHEN** a signed-in user with a completed profile opens a valid app page
- **THEN** the requested page renders in the shell

### Requirement: Starter Projects module is absent
The application shell SHALL not expose the starter Projects module.

#### Scenario: Projects navigation absent
- **WHEN** a signed-in user opens the sidebar or mobile sheet
- **THEN** no Projects navigation item is shown

#### Scenario: Projects route absent
- **WHEN** a user opens `/projects`
- **THEN** the application answers 404 `not_found`
