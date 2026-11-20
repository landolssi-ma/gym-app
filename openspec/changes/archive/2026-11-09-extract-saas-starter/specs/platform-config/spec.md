# Spec Delta

## Purpose

Gives the app one typed, validated configuration read from the environment, so a missing or wrong value fails loudly at startup and optional integrations switch off cleanly when they are not configured.

## ADDED Requirements

### Requirement: Configuration is validated before use
The system SHALL validate every configuration value against a schema before any request is served. A missing or malformed required value SHALL stop the request with an error that names the variable and never prints its value.

#### Scenario: Required value missing
- **WHEN** the app starts without the auth secret set
- **THEN** every request fails with a configuration error that names the missing variable
- **AND** no secret value appears in the error or the logs

#### Scenario: Malformed value
- **WHEN** the app origin is set to a value that is not a URL
- **THEN** the configuration error names the app origin variable and states that it must be a URL

#### Scenario: Valid configuration
- **WHEN** every required value is present and well formed
- **THEN** requests are served and the validated configuration is reused for the rest of the request

### Requirement: Optional integrations turn off when not configured
Each optional integration (Google sign-in, product analytics) SHALL be enabled only when all of its values are set. When it is off, every feature that does not depend on it SHALL work unchanged, and the UI SHALL not offer it.

#### Scenario: Google sign-in not configured
- **WHEN** the Google client id and secret are absent
- **THEN** the sign-in page shows no Google button
- **AND** email code and password sign-in work

#### Scenario: Integration partly configured
- **WHEN** only the Google client id is set and the secret is absent
- **THEN** Google sign-in is off, exactly as if neither value were set

#### Scenario: Analytics not configured
- **WHEN** the analytics key is absent
- **THEN** no analytics events are sent from the server or the browser and no request fails because of it

### Requirement: Secrets stay on the server
The system SHALL send to the browser only configuration values marked public (for example the app origin and the analytics key and host). Secrets SHALL never appear in HTML, client bundles, or API responses.

#### Scenario: Client bundle inspected
- **WHEN** the built client assets and a rendered page are searched for the auth secret, database URL, payment provider keys and email provider key
- **THEN** none of them is found

### Requirement: Site identity is defined once
Product name, logo, support email, sender address and auth cookie prefix SHALL come from one site configuration. Every surface that shows or uses them (pages, emails, metadata, cookies) SHALL read them from there.

#### Scenario: Product renamed
- **WHEN** a developer changes the product name in the site configuration
- **THEN** page titles, email layouts, the footer and structured data all show the new name without other edits

#### Scenario: Cookie prefix changed
- **WHEN** a developer changes the cookie prefix in the site configuration
- **THEN** session cookies are issued under the new prefix

### Requirement: Example environment lists every variable
The repository SHALL ship an example environment file that lists every variable the app reads, marks which are required and which are optional, and says what turns off when an optional one is left empty.

#### Scenario: New variable added
- **WHEN** the configuration schema gains a variable that the example environment file does not list
- **THEN** a repository check fails and names the missing variable
