# Spec Delta

## Purpose

Provides direct account-owned access to product data and pages for a signed-in user, without workspaces, subscriptions or plan context.

## ADDED Requirements

### Requirement: Signed-in users own their product data directly
A signed-in user SHALL access product records owned by their account, without selecting or creating a workspace.

#### Scenario: User opens the dashboard
- **WHEN** a signed-in user opens the dashboard
- **THEN** the system loads product data belonging to that user

#### Scenario: Record belongs to another user
- **WHEN** a signed-in user requests a product record owned by another account
- **THEN** the system returns 404 `not_found`

### Requirement: Authentication directly opens the product
After successful authentication, the system SHALL send the user to their requested app path or the dashboard. It SHALL NOT require a survey or a subscription step.

#### Scenario: First sign-in
- **WHEN** a user signs in for the first time
- **THEN** they enter the dashboard or an explicitly requested app path

#### Scenario: Account with no plan
- **WHEN** an authenticated user opens any product page
- **THEN** the page opens without a plan or subscription check
