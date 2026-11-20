# Spec Delta

## Purpose

Takes a new visitor from the landing page through sign-up, a short survey and trial checkout to an active workspace dashboard, and keeps sending a workspace without a subscription back to the plans page.

## ADDED Requirements

### Requirement: Landing call to action leads to sign-up
The landing page call to action SHALL open the sign-in page in sign-up mode. A visitor who is already signed in SHALL be sent to the next funnel step instead.

#### Scenario: New visitor
- **WHEN** a signed-out visitor clicks the landing page call to action
- **THEN** the sign-in page opens in sign-up mode

#### Scenario: Signed-in visitor
- **WHEN** a signed-in user with an active subscription clicks the call to action
- **THEN** they land on the dashboard

### Requirement: After sign-in the user goes to their next step
After any sign-in, the post-sign-in step SHALL send the user to the first unfinished step for the active workspace: the survey if it is not completed, then the plans page if there is no live subscription, else the return path or the dashboard.

#### Scenario: Brand new user
- **WHEN** a new user completes sign-up
- **THEN** they land on the survey

#### Scenario: Returning subscriber
- **WHEN** a user whose workspace completed the survey and is trialing signs in
- **THEN** they land on the dashboard

### Requirement: Survey
The survey SHALL show the questions defined in the survey config, one step at a time. Submitting SHALL store the answers on the workspace with a completion time. Missing required answers SHALL return 400 `incomplete`. The survey SHALL be shown once per workspace.

#### Scenario: Survey completed
- **WHEN** the owner answers every required question and submits
- **THEN** the answers and completion time are stored on the workspace and the user moves to the plans page

#### Scenario: Required answer missing
- **WHEN** the survey is submitted without a required answer
- **THEN** the response is 400 `incomplete` and the survey stays open on that question

#### Scenario: Question added to config
- **WHEN** a developer adds a question to the survey config
- **THEN** the survey shows it without other code changes

### Requirement: Plans page
The plans page SHALL show one card per plan from the plan definition with its price, limits and features, a monthly or yearly switch, and the trial length when the workspace is eligible. Choosing a plan SHALL start checkout.

#### Scenario: Trial-eligible workspace
- **WHEN** an eligible owner opens the plans page
- **THEN** each card shows the trial length and the button starts a trial checkout

#### Scenario: Not eligible
- **WHEN** the owner of a workspace that is not trial-eligible opens the plans page
- **THEN** no card mentions a trial

#### Scenario: Non-owner
- **WHEN** an admin or member of a workspace without a subscription opens the plans page
- **THEN** the cards are shown without checkout buttons and a message asks them to contact the owner

### Requirement: Checkout success waits for activation
After checkout, the success page SHALL wait until the webhook makes the subscription live, then go to the dashboard. If it is not live within 30 seconds, the page SHALL say activation is taking longer and offer to retry or contact support.

#### Scenario: Webhook arrives
- **WHEN** the subscription becomes trialing a few seconds after the user lands on the success page
- **THEN** the page goes to the dashboard on its own

#### Scenario: Webhook delayed
- **WHEN** no live subscription exists 30 seconds after landing on the success page
- **THEN** the page shows the delay message with retry and support options

### Requirement: Abandoned checkout returns to plans
When the user leaves the provider's checkout without paying, they SHALL return to the plans page with nothing changed.

#### Scenario: Checkout canceled
- **WHEN** the user closes the checkout and returns
- **THEN** they see the plans page and the workspace still has no subscription

### Requirement: Workspaces without a subscription are sent to plans
Every product page SHALL send a workspace without a live subscription to the plans page. Billing, settings, team, the survey and the plans page itself SHALL stay reachable.

#### Scenario: Direct link to a product page
- **WHEN** the owner of a workspace with no subscription opens `/projects`
- **THEN** they are sent to the plans page

#### Scenario: Settings stay reachable
- **WHEN** the same owner opens the profile page
- **THEN** the profile page opens

### Requirement: Invited users join without the funnel
A user who joins a workspace by accepting an invitation SHALL land on that workspace's dashboard without seeing the survey or the plans page, as long as the workspace has a live subscription.

#### Scenario: Invitee signs up
- **WHEN** a new user signs up from an invitation link to a trialing workspace and accepts
- **THEN** they land on that workspace's dashboard
