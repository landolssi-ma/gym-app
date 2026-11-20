# app-shell Specification

## Purpose

Provides the signed-in frame every product page lives in (navigation, workspace switcher, user menu) and the shared settings pages, in the source product's design, including the suspended and impersonation states.

## Requirements

### Requirement: Signed-in pages require a session
Opening an app page without a valid session SHALL redirect to the sign-in page with the requested path as return path. After sign-in the user SHALL land on that path when it is a path of the app.

#### Scenario: Deep link while signed out
- **WHEN** a signed-out visitor opens `/projects`
- **THEN** they are sent to sign-in and, after signing in, land on `/projects`

#### Scenario: External return path
- **WHEN** the return path points to another site
- **THEN** after sign-in the user lands on the dashboard instead

### Requirement: Shell layout
Every signed-in page SHALL render inside the shell: a sidebar with the navigation items from the navigation config, a header with the current workspace and page actions, and a user menu. On small screens the sidebar SHALL become a sheet opened from the header.

#### Scenario: Navigation item added
- **WHEN** a developer adds an item to the navigation config
- **THEN** it appears in the sidebar and the mobile sheet and is highlighted on its own pages

#### Scenario: Mobile
- **WHEN** a page is opened on a narrow screen
- **THEN** the sidebar is hidden and a menu button in the header opens it as a sheet

### Requirement: Navigation respects roles and plan
A navigation item SHALL be able to declare required roles or a plan feature, and SHALL be hidden from members who lack them. Hiding SHALL be cosmetic: the server checks still apply.

#### Scenario: Admin-only item
- **WHEN** a member with role member views the sidebar
- **THEN** items restricted to owner and admin are not shown

### Requirement: Workspace switcher
The shell SHALL show a switcher that lists the user's workspaces, marks the active one, switches on selection, and offers to create a workspace.

#### Scenario: Switch
- **WHEN** a user picks another workspace in the switcher
- **THEN** the page reloads its data for that workspace and the switcher marks it active

### Requirement: User menu
The user menu SHALL show the user's name, email and avatar, and link to profile, security, workspace settings, team, billing and sign out. Platform admins SHALL also see a link to the admin backoffice.

#### Scenario: Sign out
- **WHEN** a user picks sign out
- **THEN** the current session ends and the browser goes to the sign-in page

### Requirement: Profile settings
The profile page SHALL let a user change their name and avatar and start an email change.

#### Scenario: Name changed
- **WHEN** a user saves a new name
- **THEN** the shell and user menu show the new name

### Requirement: Security settings
The security page SHALL let a user change or set their password, list their active sessions with the current one marked, revoke a session, and sign out everywhere.

#### Scenario: Revoke another session
- **WHEN** a user revokes a session that is not the current one
- **THEN** it disappears from the list and the user stays signed in

#### Scenario: Account without a password
- **WHEN** a user who only signs in with email codes opens the security page
- **THEN** the page offers to set a password instead of change it

### Requirement: Workspace settings
The workspace page SHALL let owner and admins change the workspace name and logo, and SHALL let the owner delete the workspace. Members SHALL see the settings read-only.

#### Scenario: Member opens workspace settings
- **WHEN** a member with role member opens the workspace page
- **THEN** name and logo are shown without edit controls and there is no delete action

### Requirement: Team page
The team page SHALL list members with their roles and pending invitations with their expiry, show seats used of the seat limit, and offer invite, revoke, remove, change role, leave and transfer ownership according to the viewer's role.

#### Scenario: Owner view
- **WHEN** the owner opens the team page
- **THEN** they see invite, revoke, remove, change role and transfer ownership controls

#### Scenario: Member view
- **WHEN** a member with role member opens the team page
- **THEN** they see the list and a leave action, and no management controls

### Requirement: Billing page
The billing page SHALL show the plan, interval, status, trial or period end, scheduled cancellation and usage against limits. For the owner it SHALL offer change plan, cancel or resume, customer portal, and delete account and delete workspace dialogs.

#### Scenario: Scheduled cancellation
- **WHEN** the owner opens the billing page of a subscription set to cancel
- **THEN** the page shows the end date and a resume button

### Requirement: Destructive actions are confirmed
Deleting the account or the workspace SHALL open a dialog that names what will be removed and requires typing the confirmation before the action is enabled.

#### Scenario: Delete workspace dialog
- **WHEN** the owner opens the delete workspace dialog
- **THEN** the delete button stays disabled until the workspace name is typed exactly

### Requirement: Suspended workspace state
When the active workspace is suspended, the shell SHALL replace page content with a suspended notice that gives the support email and lets the user switch to another workspace.

#### Scenario: Suspended
- **WHEN** a member opens any app page in a suspended workspace
- **THEN** the suspended notice is shown instead of the page and the switcher still works

### Requirement: Impersonation banner
While a platform admin impersonates a user, every app page SHALL show a banner naming the impersonated user with a button to stop impersonating.

#### Scenario: Stop impersonating
- **WHEN** the admin clicks stop in the banner
- **THEN** the impersonation session ends and the admin returns to the backoffice as themselves

### Requirement: The design matches the source product
Shell, settings pages and dialogs SHALL use the source product's components, spacing and design tokens. Colors and sizes SHALL come only from the design tokens, so a rebrand is a token change.

#### Scenario: Hard-coded color
- **WHEN** a component uses a hex color or an arbitrary size value instead of a token
- **THEN** lint fails and names the file

### Requirement: Interface text comes from the string catalog
All interface text, including error messages for API error codes, SHALL come from one English string catalog.

#### Scenario: Missing string
- **WHEN** a component uses a string key that is not in the catalog
- **THEN** the typecheck fails
