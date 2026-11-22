# Spec Delta

## MODIFIED Requirements

### Requirement: After sign-in the user goes to their next step
After any sign-in, the post-sign-in step SHALL send the user to the gym profile if it is incomplete, then to the requested app path or dashboard.

#### Scenario: Brand new user
- **WHEN** a new user completes sign-up
- **THEN** they land on the gym profile form

#### Scenario: Returning subscriber
- **WHEN** a user whose gym profile is complete signs in
- **THEN** they land on the dashboard

#### Scenario: Returning user with a complete profile
- **WHEN** a user with a completed gym profile signs in
- **THEN** they land on the dashboard or their return path

#### Scenario: Returning user with an incomplete profile
- **WHEN** a user with an incomplete gym profile signs in
- **THEN** they land on the gym profile form

## REMOVED Requirements

### Requirement: Survey
**Reason**: The starter workspace survey is replaced by the account-owned gym profile.
**Migration**: Redirect unfinished starter surveys to the gym profile form and do not add the legacy survey questions to the new profile.
