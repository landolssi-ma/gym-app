# billing Specification

## Purpose

Charges each workspace for a paid plan through the payment provider, from trial to cancellation, and keeps the workspace's subscription record in step with the provider through verified webhooks.

## Requirements

### Requirement: Plans are defined in code
Every plan SHALL be defined in one plan definition: id, name, monthly and yearly price, trial days, count limits, meters and features. A setup command SHALL create or update the matching provider products and the webhook endpoint, and running it again with no change SHALL change nothing.

#### Scenario: Price changed
- **WHEN** a developer changes a plan's monthly price and runs the setup command
- **THEN** the provider product for that plan and interval has the new price

#### Scenario: Setup run twice
- **WHEN** the setup command runs twice with the same plan definition
- **THEN** the second run creates no product and no webhook endpoint

### Requirement: There is no free plan
A workspace SHALL have product access only while its subscription is trialing or active. Without one, it SHALL reach only billing, settings, the onboarding funnel and workspace switching.

#### Scenario: Subscription ended
- **WHEN** a workspace's subscription has ended
- **THEN** opening any product page sends the member to the plans page

#### Scenario: Never subscribed
- **WHEN** a workspace has never had a subscription
- **THEN** product API routes return 402 `upgrade_required` with reason `subscription_inactive`

### Requirement: One trial per user
Only the workspace created at a user's first sign-up SHALL be eligible for a trial, and only for its first subscription. Checkout from an eligible workspace SHALL start a trial of the plan's trial days; any other checkout SHALL charge at once.

#### Scenario: Eligible checkout
- **WHEN** a new user checks out a plan with 14 trial days from their personal workspace
- **THEN** the subscription is trialing and its trial ends 14 days later

#### Scenario: Second workspace
- **WHEN** the same user checks out from a workspace they created later
- **THEN** no trial is offered and the first payment is taken at checkout

#### Scenario: Resubscribing after cancellation
- **WHEN** a workspace whose trial subscription ended checks out again
- **THEN** no trial is offered

### Requirement: Checkout
The owner SHALL be able to start checkout for a plan and interval (monthly or yearly) and SHALL receive a hosted checkout URL. An unknown plan SHALL return 400 `invalid_plan`; a workspace with a trialing or active subscription SHALL get 409 `already_subscribed`.

#### Scenario: Yearly checkout
- **WHEN** the owner starts checkout for a plan with interval yearly
- **THEN** the checkout URL charges the plan's yearly price

#### Scenario: Already subscribed
- **WHEN** the owner of a workspace with an active subscription starts checkout
- **THEN** the response is 409 `already_subscribed`

### Requirement: Subscription status
Each workspace SHALL have at most one subscription record with plan, interval, status, trial end, current period, cancel-at-period-end flag and provider ids. Status SHALL be one of `trialing`, `active`, `past_due`, `canceled`, `ended`; `trialing` is derived while the trial end is in the future.

#### Scenario: Trial in progress
- **WHEN** the provider reports the subscription as active and the trial end is still in the future
- **THEN** the workspace's status is `trialing`

#### Scenario: Payment failed
- **WHEN** the provider puts the subscription on hold after a failed payment
- **THEN** the status is `past_due`

### Requirement: Webhooks are verified and applied once
The billing webhook SHALL verify the provider signature and return 401 `invalid_signature` on failure. Each webhook id SHALL be applied at most once; a replay SHALL return 200 and change nothing. Events for an unknown or deleted workspace SHALL be acknowledged and ignored.

#### Scenario: Forged webhook
- **WHEN** a request to the webhook path has a wrong signature
- **THEN** the response is 401 `invalid_signature` and no record changes

#### Scenario: Replay
- **WHEN** the provider delivers the same webhook id twice
- **THEN** both deliveries return 200 and the subscription record and emails reflect only one

#### Scenario: Event for a purged workspace
- **WHEN** a valid webhook arrives for a workspace that no longer exists
- **THEN** the response is 200 and nothing is written besides the dedupe record

### Requirement: Subscription changes are announced to product code
After a webhook changes a subscription's status and the change is stored, the system SHALL emit one `billing/subscription.changed` event with the workspace id, previous status and next status.

#### Scenario: Trial converts
- **WHEN** a trialing subscription is charged at trial end and becomes active
- **THEN** one `billing/subscription.changed` event is emitted with previous `trialing` and next `active`

### Requirement: Lifecycle emails
The workspace owner SHALL receive one email per transition: subscription started, subscription canceled, and payment failed. Emails SHALL be sent only after the change is stored, and a failed send SHALL not undo the change or fail the webhook.

#### Scenario: Payment failure email
- **WHEN** a subscription moves from `active` to `past_due`
- **THEN** the owner receives one payment failed email with a link to update the payment method

#### Scenario: Email provider down
- **WHEN** sending the subscription started email fails
- **THEN** the webhook still returns 200 and the subscription is still active

### Requirement: Trial reminder
Once a day, the system SHALL email the owner of each workspace whose trial ends in 6 to 7 days, with the trial end date and a link to cancel. Each trial SHALL get at most one reminder.

#### Scenario: Trial ends in six and a half days
- **WHEN** the daily reminder run finds a trial ending in 6.5 days
- **THEN** the owner receives one trial reminder email

#### Scenario: Run repeated on the same day
- **WHEN** the reminder run executes twice on the same day
- **THEN** the owner still receives only one reminder

### Requirement: Plan change
The owner SHALL be able to preview and then apply a change of plan or interval. The preview SHALL show the amount due. The same plan and interval SHALL return 409 `same_plan`. A plan whose limits are below current usage SHALL return 409 `exceeds_plan_limits` naming the limit.

#### Scenario: Upgrade
- **WHEN** the owner previews and confirms an upgrade
- **THEN** the preview showed the prorated amount and the subscription moves to the new plan

#### Scenario: Downgrade below current usage
- **WHEN** a workspace with 5 members tries to change to a plan with 3 seats
- **THEN** the response is 409 `exceeds_plan_limits` naming `seats` and the plan stays the same

### Requirement: Cancel and resume
The owner SHALL be able to cancel; access SHALL continue until the end of the current period or trial, with no further charge. Before that end, the owner SHALL be able to resume. Resuming a subscription not set to cancel SHALL return 409 `not_scheduled`.

#### Scenario: Cancel during trial
- **WHEN** the owner cancels while trialing
- **THEN** access continues until the trial end, no payment is taken, and the subscription then ends

#### Scenario: Resume
- **WHEN** the owner resumes a subscription that is set to cancel
- **THEN** it renews normally at period end

### Requirement: Customer portal
The owner SHALL be able to open the provider's customer portal to update the payment method and download invoices, including while the subscription is `past_due`.

#### Scenario: Past due owner updates card
- **WHEN** the owner of a `past_due` workspace opens the billing page
- **THEN** the page shows the failed payment and a button that opens the customer portal

### Requirement: Only the owner manages billing
Checkout, plan change, cancel, resume and the customer portal SHALL be available only to the owner; other roles SHALL get 403 `forbidden`. Every member SHALL be able to see the plan and status.

#### Scenario: Admin opens billing
- **WHEN** an admin opens the billing page
- **THEN** they see the plan and status but no button to change, cancel or manage payment

### Requirement: Local webhook simulation
A development command SHALL send correctly signed billing events for a chosen workspace and transition to the local webhook endpoint, so the full lifecycle can be exercised without provider keys.

#### Scenario: Simulate payment failure
- **WHEN** a developer simulates a payment failure for a seeded workspace
- **THEN** the local webhook accepts it, the status becomes `past_due` and the payment failed email is logged
