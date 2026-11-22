# Spec Delta

## Purpose

Stores and validates the personal measurements and training preferences needed to personalize a signed-in user's gym experience.

## ADDED Requirements

### Requirement: Complete gym profile on first launch
The system SHALL require a signed-in user to complete their gym profile before accessing normal app pages.

#### Scenario: First sign-in
- **WHEN** a signed-in user completes sign-in without a completed gym profile
- **THEN** the system sends the user to the gym profile form

#### Scenario: Profile incomplete
- **WHEN** a signed-in user opens an app page without a completed gym profile
- **THEN** the system sends the user to the gym profile form

#### Scenario: Profile complete
- **WHEN** a signed-in user with a completed gym profile opens an app page
- **THEN** the requested page is accessible

### Requirement: Gym profile fields
The profile SHALL collect sex, age, height in centimetres, current weight in kilograms, waist circumference in centimetres, optional hip circumference in centimetres, sport level and fitness goal.

#### Scenario: Required fields submitted
- **WHEN** the user submits sex, age, height, weight, waist circumference, sport level, goal and weekly session count
- **THEN** the system stores all submitted values and marks the profile complete

#### Scenario: Hip circumference omitted
- **WHEN** the user submits a valid profile without hip circumference
- **THEN** the profile is stored as complete and the hip circumference remains empty

#### Scenario: Invalid required field
- **WHEN** the user submits without a required field or with an out-of-range value
- **THEN** the response is validation error `invalid` and no profile completion is recorded

### Requirement: Supported choices
The sport level SHALL be beginner, intermediate or advanced. The goal SHALL be muscle gain, fat loss, weight loss, weight maintenance, or body recomposition.

#### Scenario: Level selected
- **WHEN** the user selects one supported sport level
- **THEN** that level is stored with the profile

#### Scenario: Goal selected
- **WHEN** the user selects one supported fitness goal
- **THEN** that goal is stored with the profile

### Requirement: Training frequency
The profile SHALL require a number of training sessions per week.

#### Scenario: Valid weekly frequency
- **WHEN** the user selects or enters a whole-number weekly session count from 1 through 7
- **THEN** the system stores the count

#### Scenario: Invalid weekly frequency
- **WHEN** the user enters fewer than 1 or more than 7 sessions
- **THEN** the response is validation error `invalid` and the profile stays incomplete

### Requirement: Edit a completed gym profile
A signed-in user SHALL be able to view and update their own completed gym profile.

#### Scenario: Profile loaded
- **WHEN** the user opens profile settings
- **THEN** the saved gym profile fields are shown

#### Scenario: Profile updated
- **WHEN** the user submits valid changed profile values
- **THEN** only the signed-in user's profile is updated

#### Scenario: Another user's profile
- **WHEN** a request attempts to read or change another user's gym profile
- **THEN** the system answers 404 `not_found`
