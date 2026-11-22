# Spec Delta

## ADDED Requirements

### Requirement: Platform administration focuses on accounts
The backoffice SHALL let platform admins search accounts and inspect account sessions, ban state and sign-up date. It SHALL NOT expose workspace or subscription management.

#### Scenario: Open an account
- **WHEN** an admin opens a user record
- **THEN** they see account details and active sessions, without workspace or subscription sections

## REMOVED Requirements

### Requirement: Platform admin is separate from workspace roles
**Reason**: Workspace roles no longer exist.
**Migration**: Remove workspace-role separation checks.

### Requirement: Workspaces
**Reason**: Workspaces are removed.
**Migration**: Remove workspace backoffice pages and APIs.

### Requirement: Suspend and unsuspend workspaces
**Reason**: Workspace suspension is removed.
**Migration**: Remove workspace suspension backoffice actions.

### Requirement: Subscriptions list
**Reason**: Subscriptions are removed.
**Migration**: Remove subscription backoffice listing and filters.

