# Spec Delta

## Purpose

Groups users into workspaces that own all product data, with roles, invitations and ownership rules, and keeps every workspace's data invisible to every other workspace.

## ADDED Requirements

### Requirement: A personal workspace is created at the first session
When a user gets their first session, the system SHALL create a personal workspace named from their first name, make them its owner, and make it their active workspace. It SHALL be created only once per user.

#### Scenario: First sign-in
- **WHEN** a new user named "Ada Lovelace" signs in for the first time
- **THEN** a workspace named "Ada's workspace" exists with Ada as owner and it is her active workspace

#### Scenario: Second sign-in
- **WHEN** the same user signs in again on another device
- **THEN** no new workspace is created

### Requirement: Users can create more workspaces
A signed-in user SHALL be able to create a workspace with a name. The creator SHALL become its owner and it SHALL become their active workspace. Workspaces created this way SHALL not be eligible for a trial.

#### Scenario: Create a workspace
- **WHEN** a user creates a workspace named "Acme"
- **THEN** "Acme" exists with the user as owner, it is active, and its plans page offers no trial

### Requirement: Each session has one active workspace
A new session SHALL start in the workspace the user last used, if they are still a member, else in their personal workspace. Switching workspaces SHALL change the active workspace for that session and record it as last used.

#### Scenario: Last used workspace
- **WHEN** a user last used "Acme" and signs in on a new device
- **THEN** the new session starts in "Acme"

#### Scenario: Removed from last used workspace
- **WHEN** a user was removed from "Acme", which they last used, and signs in again
- **THEN** the session starts in their personal workspace

#### Scenario: No workspace left
- **WHEN** a user has no membership left and starts a session
- **THEN** a new personal workspace is created for them, not eligible for a trial

### Requirement: The server decides the active workspace
Workspace-scoped routes SHALL take the active workspace from the session and re-check membership on every request. A client-sent workspace id SHALL only detect a stale tab: if it differs from the session's, the response SHALL be 409 `org_changed` and nothing SHALL be written.

#### Scenario: Stale tab
- **WHEN** a user switches workspace in one tab and then submits a form in a tab still showing the old workspace
- **THEN** the request returns 409 `org_changed` and the stale tab reloads into the current workspace

#### Scenario: Other tabs follow a switch
- **WHEN** a user switches workspace in one tab
- **THEN** their other open tabs of the app reload into the new workspace

#### Scenario: Membership removed mid-session
- **WHEN** a member is removed while they have the workspace open
- **THEN** their next workspace-scoped request does not return that workspace's data

### Requirement: Workspace data is isolated
Every record owned by a workspace SHALL belong to exactly one workspace and SHALL be readable or writable only from it. Ids that exist in another workspace SHALL return 404 `not_found`, the same as ids that do not exist.

#### Scenario: Id from another workspace
- **WHEN** a member of workspace A requests a project id that belongs to workspace B
- **THEN** the response is 404 `not_found`

#### Scenario: Unscoped table
- **WHEN** a new table without a workspace reference is added and is not listed as global
- **THEN** the repository's test suite fails and names the table

### Requirement: Roles define what members can do
Each member SHALL have one role: owner, admin or member. The owner manages billing, transfers ownership and deletes the workspace. Owner and admins manage members, invitations, workspace name and logo. Members use the product. A request beyond the role SHALL return 403 `forbidden`.

#### Scenario: Member tries to invite
- **WHEN** a member with role member sends an invitation
- **THEN** the response is 403 `forbidden` and no invitation is created

#### Scenario: Admin tries to cancel the subscription
- **WHEN** an admin asks to cancel the workspace's subscription
- **THEN** the response is 403 `forbidden`

#### Scenario: Admin changes a role
- **WHEN** an admin changes a member's role to admin
- **THEN** the role changes

#### Scenario: Admin cannot touch the owner
- **WHEN** an admin tries to remove the owner or change the owner's role
- **THEN** the response is 403 `forbidden`

### Requirement: Every workspace has exactly one owner
A workspace SHALL always have exactly one owner. The owner SHALL not be able to leave or be removed; leaving SHALL return 409 `only_owner` until ownership is transferred. No request SHALL make a second owner.

#### Scenario: Owner tries to leave
- **WHEN** the owner of a workspace asks to leave it
- **THEN** the response is 409 `only_owner` and they remain owner

#### Scenario: Role set to owner
- **WHEN** an admin tries to set a member's role to owner
- **THEN** the request is refused and the workspace still has one owner

### Requirement: Ownership transfer
The owner SHALL be able to transfer ownership to an existing member. The new owner SHALL get the owner role and the previous owner SHALL become an admin, in one step.

#### Scenario: Transfer
- **WHEN** the owner transfers ownership to a member
- **THEN** that member is owner, the previous owner is admin, and at no point does the workspace have zero or two owners

#### Scenario: Target is not a member
- **WHEN** the owner tries to transfer ownership to a user who is not a member
- **THEN** the response is 404 `not_found`

### Requirement: Invitations by email
Owner and admins SHALL be able to invite an email as member or admin. The system SHALL email an accept link. An invitation SHALL expire 48 hours after it is sent and SHALL be revocable until accepted. Inviting an existing member SHALL return 409 `already_member`.

#### Scenario: Invitation sent
- **WHEN** an admin invites "bob@example.com" as member
- **THEN** a pending invitation exists and Bob receives an email with an accept link

#### Scenario: Revoked invitation
- **WHEN** an invitation is revoked and the invitee then opens the link
- **THEN** the accept page says the invitation is no longer valid

#### Scenario: Expired invitation
- **WHEN** the invitee opens the link more than 48 hours after it was sent
- **THEN** the accept page says the invitation has expired

### Requirement: Accepting an invitation
Accepting SHALL require being signed in with the invited email; otherwise the response SHALL be 403 `wrong_email`. On acceptance the user SHALL become a member with the invited role, and the workspace SHALL become their active workspace.

#### Scenario: Invitee without an account
- **WHEN** an invitee with no account opens the accept link
- **THEN** they are asked to sign in or sign up with the invited email and then return to the accept page

#### Scenario: Signed in with another email
- **WHEN** a user signed in as "carol@example.com" accepts an invitation sent to "bob@example.com"
- **THEN** the response is 403 `wrong_email` and no membership is created

#### Scenario: Accepted
- **WHEN** Bob, signed in as "bob@example.com", accepts
- **THEN** Bob is a member with the invited role and lands on that workspace's dashboard

### Requirement: Seats are limited by the plan
Members plus pending, unexpired invitations SHALL count as seats, limited by the plan's seat limit. An invitation or acceptance that would exceed it SHALL return 402 `upgrade_required` with reason `seats`. Accepting an invitation SHALL not count it twice.

#### Scenario: Last seat used by an invitation
- **WHEN** a workspace on a 3-seat plan has 2 members and 1 pending invitation, and an admin invites another email
- **THEN** the response is 402 `upgrade_required` with reason `seats`

#### Scenario: Accepting the pending invitation
- **WHEN** the invitee of that pending invitation accepts
- **THEN** the acceptance succeeds and the workspace has 3 members and no pending invitation

### Requirement: Leaving and removing members
A member other than the owner SHALL be able to leave a workspace. Owner and admins SHALL be able to remove members other than the owner. A user who leaves or is removed SHALL lose access on their next request.

#### Scenario: Member leaves
- **WHEN** a member leaves a workspace that was active in their session
- **THEN** they are moved to another workspace they belong to

### Requirement: Workspace deletion
The owner SHALL be able to delete the workspace after typing its name; a mismatch SHALL return 400 `confirm_mismatch`. Deletion SHALL make the workspace inaccessible at once, cancel its subscription with no further charge, and permanently remove its data and files 30 days later.

#### Scenario: Workspace deleted
- **WHEN** the owner confirms deletion of "Acme"
- **THEN** no member can open "Acme", members who had it active are moved to another workspace, and the subscription is canceled with the provider

#### Scenario: Purge
- **WHEN** 30 days have passed since "Acme" was deleted
- **THEN** its records and stored files are permanently removed

### Requirement: Suspended workspaces are read-only notices
When a platform admin suspends a workspace, its workspace-scoped routes SHALL return 403 `org_suspended`, except the routes members need to see the suspension and switch to another workspace. Unsuspending SHALL restore access unchanged.

#### Scenario: Member of a suspended workspace
- **WHEN** a member opens the app while their active workspace is suspended
- **THEN** they see the suspended state with the support email and can switch to another workspace

### Requirement: Workspace lifecycle is announced to product code
The system SHALL emit `organization.created` when a workspace is created and `organization.deleted` when one is deleted, each with the workspace id, after the change is stored.

#### Scenario: Deletion event
- **WHEN** a workspace is deleted
- **THEN** one `organization.deleted` event is emitted with its id
