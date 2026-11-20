# admin-backoffice Specification

## Purpose

Gives platform admins, the operators of the product, the tools to support and police users, workspaces and subscriptions, without giving them powers that bypass the audit trail.

## Requirements

### Requirement: Only platform admins reach the backoffice
Backoffice pages and API routes SHALL check the platform admin role against the database on every request, never a cached value. Non-admins SHALL get the 404 page for backoffice pages and 403 `forbidden` from backoffice API routes.

#### Scenario: Regular user opens the backoffice
- **WHEN** a signed-in user who is not a platform admin opens `/admin`
- **THEN** the 404 page is shown

#### Scenario: Role removed
- **WHEN** a platform admin's role is removed in the database while they have the backoffice open
- **THEN** their next backoffice request returns 403 `forbidden`

### Requirement: Platform admin is separate from workspace roles
Being a platform admin SHALL not grant any workspace role, and a workspace owner or admin SHALL not get any backoffice access from that role.

#### Scenario: Workspace owner
- **WHEN** the owner of a workspace calls a backoffice API route
- **THEN** the response is 403 `forbidden`

### Requirement: Users
Platform admins SHALL be able to search users by email or name and open a user to see their workspaces with roles, active sessions, ban state and sign-up date.

#### Scenario: Search by email
- **WHEN** an admin searches for part of an email
- **THEN** matching users are listed with name, email, sign-up date and ban state

### Requirement: Ban and unban
A platform admin SHALL be able to ban a user with a reason and an optional end date, which revokes all of the user's sessions, and to unban them. A platform admin SHALL not be able to ban another platform admin.

#### Scenario: Ban
- **WHEN** an admin bans a user with a reason
- **THEN** the user's sessions are revoked and they cannot sign in

#### Scenario: Ban another admin
- **WHEN** an admin tries to ban another platform admin
- **THEN** the request is refused with 403 `forbidden`

### Requirement: Revoke a user's session
A platform admin SHALL be able to revoke any single session of a user.

#### Scenario: Revoke
- **WHEN** an admin revokes one session of a user
- **THEN** that session is signed out on its next request and the user's other sessions stay

### Requirement: Impersonation
A platform admin SHALL be able to impersonate a non-admin user to see the app as they do. The impersonation session SHALL end after 1 hour or when stopped, and SHALL return the admin to their own session.

#### Scenario: Start impersonating
- **WHEN** an admin impersonates a user
- **THEN** the app opens as that user with the impersonation banner on every page

#### Scenario: Impersonate an admin
- **WHEN** an admin tries to impersonate another platform admin
- **THEN** the request is refused

### Requirement: Impersonation cannot take over the account
While impersonating, requests that change credentials, sessions, membership, billing or account existence SHALL return 403 `impersonating`. This covers password and email change, session revocation, invitations and member changes, checkout, plan change, cancel, resume and account or workspace deletion.

#### Scenario: Change password while impersonating
- **WHEN** an impersonating admin tries to change the user's password
- **THEN** the response is 403 `impersonating` and the password is unchanged

#### Scenario: Revoke the user's sessions while impersonating
- **WHEN** an impersonating admin tries to sign the user out everywhere
- **THEN** the response is 403 `impersonating` and no session is revoked

### Requirement: Workspaces
Platform admins SHALL be able to search workspaces by name or id and open one to see its members, subscription, suspension state and deletion state.

#### Scenario: Open a workspace
- **WHEN** an admin opens a workspace
- **THEN** they see its members with roles and its subscription plan, status and period end

### Requirement: Suspend and unsuspend workspaces
A platform admin SHALL be able to suspend a workspace with a reason and unsuspend it. Suspension SHALL take effect on the members' next request.

#### Scenario: Suspend
- **WHEN** an admin suspends a workspace
- **THEN** its members see the suspended state on their next request and its product routes return 403 `org_suspended`

### Requirement: Subscriptions list
Platform admins SHALL be able to list subscriptions filtered by status and plan, with workspace, interval, period end and cancellation state, each linking to its workspace.

#### Scenario: Past due filter
- **WHEN** an admin filters subscriptions by status `past_due`
- **THEN** only past due subscriptions are listed

### Requirement: Admin actions are audited
Every backoffice action that changes data (ban, unban, session revoke, impersonation start and stop, suspend, unsuspend) SHALL write an audit log entry naming the admin.

#### Scenario: Suspension recorded
- **WHEN** an admin suspends a workspace
- **THEN** the audit log has a workspace suspended entry with that admin as actor and the reason in its details
