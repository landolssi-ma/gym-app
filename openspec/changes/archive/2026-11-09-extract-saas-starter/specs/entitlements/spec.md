# Spec Delta

## Purpose

Enforces on the server what each plan allows (features, count limits and usage meters), checked atomically with the write, so the UI can never grant more than the plan and an over-limit request always gets the same "upgrade required" answer.

## ADDED Requirements

### Requirement: Refusals use one response
Every entitlement refusal SHALL return 402 with body `{ "error": "upgrade_required", "reason": "<key>" }`, where the key is the feature, limit or meter name, or `subscription_inactive`. Count limit and meter refusals SHALL also include `used` and `limit`.

#### Scenario: Seat limit refusal body
- **WHEN** an invitation is refused because seats are full on a 3-seat plan
- **THEN** the response is 402 with `error` `upgrade_required`, `reason` `seats`, `used` 3 and `limit` 3

### Requirement: Feature gates
A route that uses a plan feature SHALL check that the workspace's plan includes it and that the subscription is trialing or active. A plan without the feature SHALL get 402 with the feature as reason.

#### Scenario: Feature not in plan
- **WHEN** a workspace on a plan without the `export` feature calls an export route
- **THEN** the response is 402 `upgrade_required` with reason `export` and nothing is exported

#### Scenario: Inactive subscription
- **WHEN** a workspace whose subscription is `canceled` calls a gated route
- **THEN** the response is 402 `upgrade_required` with reason `subscription_inactive`

### Requirement: Count limits are checked inside the write
For a count limit (for example `seats` or `projects`), the count and the insert SHALL happen in one transaction that serializes concurrent writers for the workspace, so concurrent requests can never push the count past the limit.

#### Scenario: Last project slot
- **WHEN** a workspace with 9 of 10 projects sends two create requests at the same time
- **THEN** exactly one succeeds and the other returns 402 with reason `projects`

#### Scenario: Deleting frees a slot
- **WHEN** a workspace at its project limit deletes a project and then creates one
- **THEN** the create succeeds

### Requirement: Usage meters reset each period
A usage meter SHALL count units per workspace per billing period. Incrementing and checking SHALL be one atomic statement. A request that would exceed the meter SHALL return 402 and SHALL not be counted. A new period SHALL start at zero.

#### Scenario: Meter exhausted
- **WHEN** a workspace has used all units of a meter for the current period and makes another metered request
- **THEN** the response is 402 with the meter as reason and the count stays at the limit

#### Scenario: New period
- **WHEN** the subscription renews into a new period
- **THEN** the meter's count for the workspace starts again at zero

### Requirement: Lowered limits keep existing data
When a workspace's limit becomes lower than its current count (for example after a plan definition change), existing records SHALL remain and SHALL stay usable; only new records beyond the limit SHALL be refused.

#### Scenario: Limit lowered by the developer
- **WHEN** a plan's project limit is lowered from 10 to 5 and a workspace on it has 8 projects
- **THEN** the 8 projects remain readable and editable, and creating a ninth returns 402 with reason `projects`

### Requirement: Entitlements are readable by the client
An API route SHALL return the active workspace's plan, subscription status, features, and each limit and meter with its current count, so the UI can show usage and hide actions the plan does not allow.

#### Scenario: Usage shown
- **WHEN** a member opens the billing page
- **THEN** it shows each limit as "used of limit", matching what the server enforces

### Requirement: The client shows one upgrade dialog
Any 402 `upgrade_required` response SHALL open the same upgrade dialog, which states the reason in plain words and links to the plans page for owners or asks other roles to contact the owner. This SHALL hold for every feature, including features added later.

#### Scenario: Member hits a limit
- **WHEN** a member's request returns 402 with reason `projects`
- **THEN** the upgrade dialog says the project limit is reached and asks them to contact the workspace owner
