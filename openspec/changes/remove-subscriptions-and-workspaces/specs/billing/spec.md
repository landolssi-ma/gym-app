# Spec Delta

## REMOVED Requirements

### Requirement: Plans are defined in code
**Reason**: The product does not use paid plans.
**Migration**: Remove plan definitions and provider setup commands.

### Requirement: There is no free plan
**Reason**: Subscription state no longer controls product access.
**Migration**: Remove live-subscription checks and plan redirection.

### Requirement: One trial per user
**Reason**: Trials are no longer offered.
**Migration**: Remove trial eligibility and trial fields.

### Requirement: Checkout
**Reason**: Users do not purchase plans.
**Migration**: Remove checkout APIs and success/cancel pages.

### Requirement: Subscription status
**Reason**: No subscription record is maintained.
**Migration**: Remove subscription persistence and status derivation.

### Requirement: Webhooks are verified and applied once
**Reason**: There is no payment provider integration.
**Migration**: Remove billing webhook verification and dedupe storage.

### Requirement: Subscription changes are announced to product code
**Reason**: Subscription lifecycle events no longer exist.
**Migration**: Remove billing subscription changed events.

### Requirement: Lifecycle emails
**Reason**: Subscription lifecycle emails are not needed.
**Migration**: Remove subscription lifecycle email templates and sends.

### Requirement: Trial reminder
**Reason**: Trials are removed.
**Migration**: Remove trial reminder jobs.

### Requirement: Plan change
**Reason**: Plans cannot be changed.
**Migration**: Remove plan preview and plan-change APIs.

### Requirement: Cancel and resume
**Reason**: There is no subscription to cancel or resume.
**Migration**: Remove cancel and resume APIs and UI.

### Requirement: Customer portal
**Reason**: No provider customer billing account exists.
**Migration**: Remove customer portal routes and billing payment-method UI.

### Requirement: Only the owner manages billing
**Reason**: Billing ownership roles no longer exist.
**Migration**: Remove billing-role guards and role-specific billing UI.

### Requirement: Local webhook simulation
**Reason**: Provider webhooks are removed.
**Migration**: Remove billing simulation commands.
