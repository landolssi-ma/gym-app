# transactional-email Specification

## Purpose

Sends the product's account, team and billing emails from one shared, branded layout, and lets developers see every email locally without an email provider.

## Requirements

### Requirement: The starter ships its email templates
The system SHALL provide these emails: sign-in code, verify email, password reset, team invitation, welcome, trial reminder, subscription started, subscription canceled and payment failed. Each SHALL have an HTML body and a plain-text body with the same content.

#### Scenario: Sign-in code email
- **WHEN** a sign-in code is sent
- **THEN** the email shows the 8-digit code, states that it expires in 10 minutes, and has a plain-text body with the same code

#### Scenario: Invitation email
- **WHEN** a team invitation is sent
- **THEN** the email names the inviter and the workspace and has a button to the accept page

### Requirement: Emails share one layout
Every email SHALL use one layout with the product logo, body, one call-to-action button when there is a link, and a footer with the product name and support email. Brand values SHALL come from the site configuration.

#### Scenario: Brand change
- **WHEN** a developer changes the logo and primary color in the site configuration
- **THEN** every email shows the new logo and button color without editing any template

### Requirement: Links in emails are absolute
Every link in an email SHALL be an absolute URL on the configured app origin.

#### Scenario: Password reset link
- **WHEN** a password reset email is sent
- **THEN** its link starts with the configured app origin

### Requirement: Email text comes from the string catalog
Email subjects and body text SHALL come from the same string catalog as the app, so copy changes do not touch template markup.

#### Scenario: Subject changed
- **WHEN** a developer changes the welcome email subject in the string catalog
- **THEN** the next welcome email uses the new subject

### Requirement: Emails are logged instead of sent in development
When no email provider key is set in development, sending SHALL succeed without contacting the provider and SHALL log the recipient, subject and every link and code in the email. In production, a missing email provider key SHALL be a configuration error.

#### Scenario: Local sign-in
- **WHEN** a developer requests a sign-in code locally with no email provider key
- **THEN** the code appears in the server log and sign-in can be completed with it

#### Scenario: Production without key
- **WHEN** the app runs in production without an email provider key
- **THEN** requests fail with a configuration error naming the email provider key

### Requirement: Sender comes from configuration
Every email SHALL be sent from the configured sender address and product name, with the support email as reply-to.

#### Scenario: Reply to a billing email
- **WHEN** a customer replies to a payment failed email
- **THEN** the reply goes to the configured support email

### Requirement: Delivery failures are reported to the caller
When the email provider rejects or fails a send, the send SHALL fail with an error that is logged with the template name and without the email body. Emails a user waits for (sign-in code, verification, password reset) SHALL surface the failure so the user can retry.

#### Scenario: Provider error on sign-in code
- **WHEN** the email provider returns an error while sending a sign-in code
- **THEN** the sign-in page shows that the email could not be sent and lets the user try again
