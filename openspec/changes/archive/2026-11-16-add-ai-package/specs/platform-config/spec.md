# Spec Delta

## MODIFIED Requirements

### Requirement: Optional integrations turn off when not configured
Each optional integration (Google sign-in, product analytics, AI generation) SHALL be enabled only when all of its values are set. When it is off, every feature that does not depend on it SHALL work unchanged, and the UI SHALL not offer it.

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

#### Scenario: AI not configured
- **WHEN** the AI gateway key or the AI model is absent, or the model is not a `provider/model` id
- **THEN** AI generation is off, the app starts, and no request that does not need AI fails because of it

### Requirement: Secrets stay on the server
The system SHALL send to the browser only configuration values marked public (for example the app origin and the analytics key and host). Secrets SHALL never appear in HTML, client bundles, or API responses.

#### Scenario: Client bundle inspected
- **WHEN** the built client assets and a rendered page are searched for the auth secret, database URL, payment provider keys, email provider key and AI gateway key
- **THEN** none of them is found
