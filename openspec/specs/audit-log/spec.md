# audit-log Specification

## Purpose

Keeps a trustworthy record of security and billing actions (who did what, to what, from where, and on whose behalf) that platform admins can search when they support or investigate a workspace.

## Requirements

### Requirement: Security and billing actions are recorded
The system SHALL record: member invited, removed or role changed; ownership transferred; workspace created, deleted, suspended or unsuspended; user banned or unbanned; impersonation started or stopped; plan changed, subscription canceled or resumed.

#### Scenario: Member removed
- **WHEN** an admin of a workspace removes a member
- **THEN** one member removed entry exists for that workspace with the admin as actor and the removed user as target

#### Scenario: Plan changed
- **WHEN** the owner changes plan
- **THEN** one plan changed entry exists with the previous and new plan in its details

### Requirement: Entries are written with the action
An audit entry SHALL be stored in the same transaction as the action it records. If the action fails, no entry SHALL remain; if the entry cannot be stored, the action SHALL fail.

#### Scenario: Action rolled back
- **WHEN** a role change fails after its audit entry was prepared
- **THEN** neither the role change nor the entry is stored

### Requirement: Entry contents
Each entry SHALL hold the time, action, actor, impersonating admin if any, workspace if any, target type and id, client IP, and action details. Details SHALL never contain passwords, codes, tokens or payment card data.

#### Scenario: Action during impersonation
- **WHEN** an admin impersonating a user creates a workspace
- **THEN** the entry names the user as actor and the admin as impersonator

#### Scenario: Ban entry
- **WHEN** a user is banned
- **THEN** the entry has no workspace, the banned user as target and the reason in its details

### Requirement: Entries cannot be changed through the app
The system SHALL offer no route to edit or delete audit entries. Entries SHALL be removed only when their workspace is permanently purged.

#### Scenario: No delete route
- **WHEN** a platform admin looks for a way to delete an entry in the backoffice or API
- **THEN** there is none

#### Scenario: Workspace purged
- **WHEN** a deleted workspace is purged after 30 days
- **THEN** its audit entries are removed with it

### Requirement: Platform admins can search the audit log
The backoffice SHALL list audit entries newest first, paginated, filterable by workspace, actor, action and date range. Only platform admins SHALL see it; other users SHALL get 403 `forbidden` from its API.

#### Scenario: Filter by workspace
- **WHEN** an admin filters the audit log by a workspace
- **THEN** only that workspace's entries are listed, newest first

#### Scenario: Workspace owner
- **WHEN** a workspace owner calls the audit log API
- **THEN** the response is 403 `forbidden`
