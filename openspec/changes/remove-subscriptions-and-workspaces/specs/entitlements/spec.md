# Spec Delta

## REMOVED Requirements

### Requirement: Refusals use one response
**Reason**: Plan entitlement refusals no longer exist.
**Migration**: Remove `upgrade_required` response handling for plans.

### Requirement: Feature gates
**Reason**: Product features are not restricted by plans.
**Migration**: Remove feature and subscription gates.

### Requirement: Count limits are checked inside the write
**Reason**: Plan count limits are removed.
**Migration**: Remove atomic limit checks and limit reason responses.

### Requirement: Usage meters reset each period
**Reason**: Billing periods and usage meters no longer exist.
**Migration**: Remove meter counters and period reset logic.

### Requirement: Lowered limits keep existing data
**Reason**: No plans or limits can be lowered.
**Migration**: Remove plan-limit migration behavior.

### Requirement: Entitlements are readable by the client
**Reason**: The client does not need subscription or plan entitlement state.
**Migration**: Remove entitlement API fields and UI usage displays.

### Requirement: The client shows one upgrade dialog
**Reason**: There is no upgrade flow.
**Migration**: Remove upgrade-dialog handling and plans-page links.
