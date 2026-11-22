# Spec Delta

## REMOVED Requirements

### Requirement: A personal workspace is created at the first session
**Reason**: Product data is owned directly by the signed-in account.
**Migration**: Remove organization creation and session active-organization state.

### Requirement: Users can create more workspaces
**Reason**: The product no longer supports multiple workspaces.
**Migration**: Remove workspace creation APIs and UI.

### Requirement: Each session has one active workspace
**Reason**: There is no workspace to select or persist in a session.
**Migration**: Remove workspace switching and active-workspace cookies or records.

### Requirement: The server decides the active workspace
**Reason**: Tenant context is replaced by the authenticated account.
**Migration**: Require authenticated account ownership on product routes.

### Requirement: Workspace data is isolated
**Reason**: Workspaces no longer exist.
**Migration**: Replace organization-owned records with account-owned records.

### Requirement: Roles define what members can do
**Reason**: Workspace member roles are not used.
**Migration**: Remove organization role checks and expose account capabilities directly.

### Requirement: Every workspace has exactly one owner
**Reason**: Workspace ownership is not used.
**Migration**: Remove owner role invariants and ownership checks.

### Requirement: Ownership transfer
**Reason**: Workspaces have no owner or membership transfer.
**Migration**: Remove ownership-transfer routes and UI.

### Requirement: Invitations by email
**Reason**: This product no longer supports shared workspaces.
**Migration**: Remove workspace invitations and invitation emails.

### Requirement: Accepting an invitation
**Reason**: Invitations are no longer part of the product.
**Migration**: Remove invitation acceptance routes and pages.

### Requirement: Seats are limited by the plan
**Reason**: Workspaces and plan seat limits are removed.
**Migration**: Remove seat counting and seat upgrade checks.

### Requirement: Leaving and removing members
**Reason**: Workspace membership is removed.
**Migration**: Remove leave and member-removal flows.

### Requirement: Workspace deletion
**Reason**: Workspaces are removed; account deletion covers account-owned data.
**Migration**: Remove workspace deletion and purge workflows.

### Requirement: Suspended workspaces are read-only notices
**Reason**: No workspace suspension state remains.
**Migration**: Remove workspace suspension and suspended notices.

### Requirement: Workspace lifecycle is announced to product code
**Reason**: Workspace lifecycle events no longer exist.
**Migration**: Remove organization-created and organization-deleted event publication.
