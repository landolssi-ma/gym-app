# Spec Delta

## ADDED Requirements

### Requirement: The web client handles account status in one place
The web client SHALL handle 401 shared status by sending the user to sign-in with a return path. It SHALL NOT handle workspace-change or plan-upgrade shared statuses.

#### Scenario: Session expired
- **WHEN** an app request returns 401
- **THEN** the browser opens sign-in with the current app path as return path

## REMOVED Requirements

### Requirement: State-changing requests come from the app origin
**Reason**: The rule remains, but billing webhook exemptions no longer exist.
**Migration**: Keep exact Origin validation and remove payment and workspace-specific exemption descriptions.
