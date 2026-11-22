# Spec Delta

## ADDED Requirements

### Requirement: Account security actions are recorded
The system SHALL record account bans, unbans, session revocations and impersonation starts and stops. Entries SHALL not require workspace or billing fields.

#### Scenario: Account session revoked
- **WHEN** a platform admin revokes a user's session
- **THEN** one audit entry records the actor, target account and revoked session action

## REMOVED Requirements

### Requirement: Security and billing actions are recorded
**Reason**: Workspace membership and billing actions no longer exist.
**Migration**: Replace the action list with account security actions.

### Requirement: Entry contents
**Reason**: Workspace is not an audit-log identity in the single-account model.
**Migration**: Remove workspace fields while preserving actor, target, IP and safe details.

### Requirement: Platform admins can search the audit log
**Reason**: The workspace filter is removed.
**Migration**: Filter account audit entries by actor, action and date range.
