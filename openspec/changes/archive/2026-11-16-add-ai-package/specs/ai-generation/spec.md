# Spec Delta

## Purpose

Gives product features one way to ask an AI model for text or structured data, with the model chosen in configuration, every call time-limited, failures answered the same way everywhere, and prompts kept out of the logs.

## ADDED Requirements

### Requirement: Text generation
An AI call for text SHALL take instructions and a prompt and return the model's whole answer as plain text, together with the model that answered and the number of input and output tokens.

#### Scenario: Text answer
- **WHEN** a feature asks for text with instructions and a prompt
- **THEN** it receives the answer text, the model id, and the input and output token counts

### Requirement: Structured generation
An AI call for structured data SHALL take a schema and return data that matches it. An answer that does not match the schema SHALL fail the call; unchecked data SHALL never reach the caller.

#### Scenario: Answer matches the schema
- **WHEN** a feature asks for data shaped as a title and a list of tags, and the model answers in that shape
- **THEN** the feature receives the title and tags as typed data, with the model id and token counts

#### Scenario: Answer does not match the schema
- **WHEN** the model answers with a missing field or a value of the wrong type
- **THEN** the call fails as an AI failure and the feature receives no data

### Requirement: Model chosen in configuration
The model SHALL be a `provider/model` id set in configuration, used by every call that does not name its own. A call MAY name a different model id for itself. Changing the configured model SHALL need no code change.

#### Scenario: Default model
- **WHEN** the configured model is `anthropic/claude-sonnet-5` and a call names no model
- **THEN** the call is answered by `anthropic/claude-sonnet-5` and its result says so

#### Scenario: Model named by the call
- **WHEN** a call names `openai/gpt-5-mini`
- **THEN** that call alone uses `openai/gpt-5-mini` and other calls keep the configured model

### Requirement: AI routes answer 503 when AI is off
When AI is not configured, a route that needs AI SHALL answer 503 `{ "error": "ai_unavailable" }` after its sign-in and workspace checks and before it counts any plan meter or calls a model. Routes that do not need AI SHALL behave as if the AI integration did not exist.

#### Scenario: AI route without configuration
- **WHEN** the AI key or model is absent and a signed-in member calls a route that needs AI
- **THEN** the response is 503 with error `ai_unavailable`
- **AND** no plan meter is counted and no model is called

#### Scenario: Other routes without configuration
- **WHEN** the AI key or model is absent
- **THEN** sign-in, workspaces, billing, uploads and every other route work unchanged

### Requirement: AI failures answer 502
A provider error, a timeout or an answer that fails its schema SHALL answer 502 `{ "error": "ai_failed" }`. The response SHALL not include the provider's error message or any part of the prompt or answer.

#### Scenario: Provider error
- **WHEN** the AI provider returns an error for a call made by a route
- **THEN** the route answers 502 with error `ai_failed` and nothing else in the body

### Requirement: Every call is time-limited
Every AI call SHALL fail as an AI failure once it runs past a fixed time limit, instead of waiting for the provider indefinitely.

#### Scenario: Provider does not answer
- **WHEN** the provider has not answered when the time limit passes
- **THEN** the call fails as an AI failure, and a route making it answers 502 `ai_failed`

### Requirement: AI calls are logged without content
Each AI call SHALL be logged with its model, token counts, duration and outcome. Logs SHALL never contain the instructions, the prompt, the answer or the AI key, because these can hold workspace data.

#### Scenario: Successful call logged
- **WHEN** an AI call succeeds
- **THEN** the log entry holds the model, input and output tokens and duration, and none of the prompt or answer text

#### Scenario: Failed call logged
- **WHEN** an AI call fails
- **THEN** the log entry holds the model, duration and the failure's kind and status, and none of the prompt or the provider's response body

### Requirement: The browser knows whether AI is on
The public configuration sent to the browser SHALL state whether AI is on, as a yes or no value with no key or model id, so a product can hide AI controls when it is off.

#### Scenario: AI off
- **WHEN** the AI key or model is absent
- **THEN** the browser's public configuration says AI is off

#### Scenario: AI on
- **WHEN** the AI key and a valid model are set
- **THEN** the browser's public configuration says AI is on and holds neither the key nor the model id
