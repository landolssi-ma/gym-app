# user-auth Specification

## Purpose

Lets people create an account and sign in with an email code, Google or a password, keeps their sessions under their control, and lets them delete their account, without letting anyone take over an account they do not own.

## Requirements

### Requirement: Sign-in with an email code
A visitor SHALL be able to request an 8-digit code by email and sign in with it. The code SHALL expire after 10 minutes and after 5 wrong attempts. Signing in with a code for an unknown email SHALL create the account with the email marked verified.

#### Scenario: First sign-in creates an account
- **WHEN** a visitor enters a new email, receives a code and enters it within 10 minutes
- **THEN** an account is created with the email verified and the visitor is signed in

#### Scenario: Expired code
- **WHEN** a code is entered more than 10 minutes after it was sent
- **THEN** sign-in is refused and the visitor is asked to request a new code

#### Scenario: Too many wrong attempts
- **WHEN** a wrong code is entered 5 times
- **THEN** the code stops working, even if the right code is entered next

### Requirement: Sign-in with Google
When Google sign-in is configured, a visitor SHALL be able to sign in with Google. A Google account whose email matches an existing account SHALL sign in to that account.

#### Scenario: Existing account, same email
- **WHEN** a person who signed up with an email code signs in with Google using the same email
- **THEN** they are signed in to their existing account, not a new one

### Requirement: Sign-up with email and password
A visitor SHALL be able to sign up with an email and a password of at least 8 characters. Passwords found in known data breaches SHALL be refused. Sign-up SHALL send a verification email and SHALL NOT sign the visitor in.

#### Scenario: Valid sign-up
- **WHEN** a visitor signs up with a new email and a strong password
- **THEN** a verification email is sent and the page asks the visitor to check their inbox

#### Scenario: Breached password
- **WHEN** a visitor signs up with a password that appears in a known breach
- **THEN** sign-up is refused with a message asking for a different password

#### Scenario: Short password
- **WHEN** a visitor signs up with a 7-character password
- **THEN** sign-up is refused

### Requirement: Password sign-in requires a verified email
Password sign-in SHALL be refused until the account's email is verified, and the refusal SHALL offer to resend the verification email. Opening a valid verification link SHALL mark the email verified and sign the person in.

#### Scenario: Unverified password account
- **WHEN** a person signs in with the right password before verifying their email
- **THEN** sign-in is refused with `email_not_verified` and a new verification email can be requested

#### Scenario: Verification link opened
- **WHEN** a person opens the verification link before it expires
- **THEN** the email is marked verified and the person is signed in

### Requirement: An unverified password never grants access to someone else's account
When a person proves they own an email (with an email code or Google) and that email has an unverified password sign-up, the unverified password SHALL be removed, so a password set by someone else can never sign in.

#### Scenario: Pre-registered email claimed through Google
- **WHEN** someone signs up with another person's email and a password, never verifies it, and the real owner later signs in with Google
- **THEN** the real owner is signed in
- **AND** the password the other person chose no longer signs in to the account

### Requirement: Wrong credentials do not reveal whether an account exists
Password sign-in with an unknown email or a wrong password SHALL return the same error. Code requests and password reset requests SHALL return the same response whether or not the email has an account.

#### Scenario: Unknown email
- **WHEN** a visitor tries a password sign-in with an email that has no account
- **THEN** the error is the same as for a wrong password

#### Scenario: Reset for unknown email
- **WHEN** a visitor requests a password reset for an email that has no account
- **THEN** the page shows the same confirmation as for a known email and no email is sent

### Requirement: Password reset
A person SHALL be able to request a password reset link by email and set a new password through it. The link SHALL work once and expire after 1 hour. A successful reset SHALL revoke all of the account's sessions.

#### Scenario: Reset completed
- **WHEN** a person opens a valid reset link and sets a new password
- **THEN** the new password works, the old one does not, and every existing session is signed out

#### Scenario: Link reused
- **WHEN** a reset link that was already used is opened again
- **THEN** the page says the link is no longer valid and offers to send a new one

### Requirement: Signed-in users can change their password and email
A signed-in user SHALL be able to change their password by giving the current one, and to change their email. A new email SHALL take effect only after it is verified through a link sent to it.

#### Scenario: Wrong current password
- **WHEN** a user tries to change their password with a wrong current password
- **THEN** the change is refused and the password stays the same

#### Scenario: Email change
- **WHEN** a user asks to change their email to a new address
- **THEN** a verification link is sent to the new address and the account keeps the old email until the link is opened

### Requirement: Sessions are checked on every request
Sessions SHALL be stored server-side and read fresh on every request, so a revoked session or a ban takes effect on the next request. The session cookie SHALL use the configured prefix, be HttpOnly, SameSite=Lax, and Secure outside local development.

#### Scenario: Session revoked from another device
- **WHEN** a user revokes a session from the security page
- **THEN** the next request made with that session is treated as signed out

### Requirement: Users manage their own sessions
A signed-in user SHALL be able to list their active sessions (device, approximate location from IP, last active time), revoke any one of them, and sign out of every session at once.

#### Scenario: Sign out everywhere
- **WHEN** a user chooses "sign out everywhere"
- **THEN** every session of the user is revoked, including the current one, and the browser is sent to the sign-in page

### Requirement: Auth endpoints are rate limited
Sign-in, sign-up, code requests, verification resends and password reset requests SHALL be rate limited per client IP, with counts shared across all server instances. Over the limit, the response SHALL be 429.

#### Scenario: Code request flood
- **WHEN** one IP requests sign-in codes faster than the limit allows
- **THEN** further requests return 429 and no more emails are sent until the window passes

### Requirement: Banned users cannot sign in
A banned user SHALL not be able to sign in by any method, and banning SHALL revoke their sessions. The sign-in page SHALL tell them the account is suspended and give the support email. A ban with an end date SHALL lift itself at that date.

#### Scenario: Banned user tries a code
- **WHEN** a banned user enters a valid email code
- **THEN** sign-in is refused with the suspended-account message

#### Scenario: Temporary ban ends
- **WHEN** a ban's end date passes
- **THEN** the user can sign in again

### Requirement: Account deletion
A user SHALL be able to delete their account after typing a confirmation phrase. Deletion SHALL be refused with 409 `owns_organization_with_members` while they own a workspace that has other members. Otherwise it SHALL revoke their sessions, remove their memberships and delete the workspaces they own.

#### Scenario: Owner of a shared workspace
- **WHEN** a user who owns a workspace with two other members asks to delete their account
- **THEN** the response is 409 `owns_organization_with_members` and nothing is deleted

#### Scenario: Wrong confirmation
- **WHEN** the typed confirmation does not match
- **THEN** the response is 400 `confirm_mismatch`

#### Scenario: Account deleted
- **WHEN** a user who owns only a personal workspace confirms deletion
- **THEN** they are signed out everywhere, the account can no longer sign in, and the personal workspace is deleted as described for workspace deletion

### Requirement: The platform admin role cannot be self-assigned
The platform admin role SHALL be grantable only by a direct database change or the seed. No sign-up or profile request SHALL be able to set it.

#### Scenario: Role sent in a profile update
- **WHEN** a user sends a profile update that includes `role: "admin"`
- **THEN** the user's role stays unchanged

### Requirement: Account creation is announced to product code
When a new account first has a verified email (at creation for email code and Google, at verification for password sign-up), the system SHALL emit one `user.created` event with the user id and email, and SHALL send one welcome email.

#### Scenario: Sign-up by email code
- **WHEN** a new account is created through an email code
- **THEN** one `user.created` event is emitted and one welcome email is sent

#### Scenario: Password sign-up not yet verified
- **WHEN** a visitor signs up with a password and has not opened the verification link
- **THEN** no `user.created` event is emitted and no welcome email is sent until they do
