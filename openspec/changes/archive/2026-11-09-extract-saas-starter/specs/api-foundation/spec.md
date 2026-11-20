# Spec Delta

## Purpose

Defines the conventions every API route shares: one error format, request checks that run before any route, rate limiting, input validation and a health check, so features only write their own logic.

## ADDED Requirements

### Requirement: One error format
Every API error response SHALL have a JSON body `{ "error": "<code>" }` and an HTTP status that matches the code. Extra fields SHALL appear only when the code documents them. Unknown routes SHALL return 404 `not_found`.

#### Scenario: Unknown route
- **WHEN** a client requests `/api/does-not-exist`
- **THEN** the response is 404 with body `{ "error": "not_found" }`

#### Scenario: Unhandled server error
- **WHEN** a route throws an unexpected error
- **THEN** the response is 500 with body `{ "error": "internal" }`
- **AND** the error and its stack are logged on the server and never sent to the client

### Requirement: Request input is validated
Each route SHALL validate its body, query and path parameters before running. Invalid input SHALL return 400 `invalid` without side effects.

#### Scenario: Malformed body
- **WHEN** a client sends a body with a missing required field or a wrong type
- **THEN** the response is 400 `invalid` and nothing is written

### Requirement: State-changing requests come from the app origin
For every method other than GET, HEAD and OPTIONS, the request `Origin` header SHALL equal the configured app origin exactly, or the request SHALL be refused with 403 `forbidden_origin`. Only the billing webhook and the job runner endpoint are exempt, matched by exact path.

#### Scenario: Cross-site POST
- **WHEN** a POST to `/api/team/invites` carries an `Origin` of another site
- **THEN** the response is 403 `forbidden_origin` and nothing is written

#### Scenario: Missing Origin
- **WHEN** a DELETE request has no `Origin` header
- **THEN** the response is 403 `forbidden_origin`

#### Scenario: Exempt webhook path
- **WHEN** the payment provider POSTs to the billing webhook path without an `Origin` header
- **THEN** the request reaches signature verification

#### Scenario: Path that only resembles an exempt path
- **WHEN** a cross-site POST targets a path that starts with the webhook path but is not equal to it
- **THEN** the response is 403 `forbidden_origin`

### Requirement: Duplicate auth cookies are refused
A request carrying more than one cookie with the same auth cookie name SHALL be refused with 400 `duplicate_cookie` before any session is read, so a cookie planted on a sibling domain cannot shadow the real session.

#### Scenario: Two session cookies
- **WHEN** a request carries the session cookie twice with different values
- **THEN** the response is 400 `duplicate_cookie`

### Requirement: Signed-in routes reject requests without a valid session
A route that needs a user SHALL return 401 `unauthorized` when the session is missing, expired, revoked or belongs to a banned user. The same response SHALL expire the rejected session cookie.

#### Scenario: Revoked session
- **WHEN** a session is revoked and its cookie is then used on a signed-in route
- **THEN** the response is 401 `unauthorized`
- **AND** the response expires the session cookie

### Requirement: Rate limits are enforced across all instances
Rate-limited actions SHALL count requests per subject (user, or client IP when signed out) and bucket in fixed time windows stored in the database. Counting and checking SHALL happen in one atomic step. Over the limit, the response SHALL be 429 `rate_limited`.

#### Scenario: Limit reached
- **WHEN** a subject sends one request more than the bucket's limit within one window
- **THEN** that request returns 429 `rate_limited` and has no side effects

#### Scenario: Concurrent requests at the limit
- **WHEN** two requests from the same subject arrive at the same time and only one unit of the limit is left
- **THEN** exactly one succeeds and the other returns 429 `rate_limited`

#### Scenario: New window
- **WHEN** a subject was limited and the next window starts
- **THEN** the subject's requests succeed again

#### Scenario: Client IP source
- **WHEN** a signed-out request carries a forged forwarding header
- **THEN** the limit is counted against the IP reported by the edge network, not the header value

### Requirement: Health check verifies the database
The health route SHALL require the configured smoke token and return 404 `not_found` without it. With it, the route SHALL write a fresh value to the database, read it back, and return success only when the read returns that value.

#### Scenario: Anonymous request
- **WHEN** a client calls the health route without the smoke token
- **THEN** the response is 404 `not_found` and the database is not queried

#### Scenario: Healthy database
- **WHEN** the smoke script calls the health route with the token
- **THEN** the response is 200 and confirms the read returned the value just written

#### Scenario: Database unreachable
- **WHEN** the database cannot be reached
- **THEN** the health route returns a 5xx status

### Requirement: The web client handles shared error statuses in one place
The web client SHALL handle shared statuses for every feature: 401 sends the user to sign-in with a return path, 409 `org_changed` reloads into the current workspace, and 402 opens the upgrade dialog. Every error code SHALL map to a user-facing message.

#### Scenario: Session expired in an open tab
- **WHEN** a request from the app returns 401
- **THEN** the browser goes to the sign-in page with the current path as the return path

#### Scenario: Unknown error code
- **WHEN** the client receives an error code that has no message
- **THEN** it shows the generic error message
