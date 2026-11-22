# Spec Delta

## ADDED Requirements

### Requirement: Account deletion removes account-owned data
A signed-in user SHALL be able to delete their account after typing the configured confirmation phrase. Confirmation SHALL revoke sessions and permanently remove account-owned product data and files.

#### Scenario: Wrong confirmation
- **WHEN** the typed confirmation does not match
- **THEN** the response is 400 `confirm_mismatch`

#### Scenario: Account deleted
- **WHEN** the user confirms deletion
- **THEN** sessions are revoked, the account cannot sign in again, and account-owned product data and files are removed

## REMOVED Requirements

### Requirement: Account deletion
**Reason**: Workspace ownership and shared-workspace membership no longer determine account deletion.
**Migration**: Replace workspace deletion checks with account-owned data cleanup.
