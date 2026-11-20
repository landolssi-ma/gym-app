# Spec Delta

## Purpose

Lets members upload files straight from the browser to object storage, keeps a record of each file in its workspace, and serves private files through short-lived links while avatars and workspace logos stay public.

## ADDED Requirements

### Requirement: Uploads start with a declared file
To upload, a member SHALL declare the file name, content type, size and purpose. The system SHALL refuse a disallowed content type or a size over the purpose's maximum with 400 `invalid_file`. Otherwise it SHALL create a pending file record and return its id and an upload URL.

#### Scenario: Upload accepted
- **WHEN** a member declares a 2 MB PDF for a purpose that allows PDFs up to 10 MB
- **THEN** the response contains a file id and an upload URL, and the file record is pending

#### Scenario: Too large
- **WHEN** a member declares an avatar of 20 MB where avatars allow at most 5 MB
- **THEN** the response is 400 `invalid_file` and no record is created

### Requirement: The browser uploads directly to storage
The upload URL SHALL accept one PUT of the declared content type to the file's storage key only, and SHALL expire 15 minutes after it is issued. File bytes SHALL never pass through the app server.

#### Scenario: Expired upload URL
- **WHEN** the browser uses an upload URL 16 minutes after it was issued
- **THEN** storage refuses the upload

#### Scenario: Different content type
- **WHEN** the browser sends the PUT with a content type other than the declared one
- **THEN** storage refuses the upload

### Requirement: Uploads are confirmed before use
After uploading, the client SHALL confirm the upload. The system SHALL check that the object exists and that its size and content type match the declaration, then mark the file ready. A missing object SHALL return 409 `upload_missing`; a mismatch SHALL return 400 `upload_mismatch` and delete the object.

#### Scenario: Confirmed
- **WHEN** the client confirms an upload whose object matches the declaration
- **THEN** the file is ready

#### Scenario: Size differs from the declaration
- **WHEN** the stored object is larger than the declared size
- **THEN** the response is 400 `upload_mismatch`, the object is deleted and the file never becomes ready

### Requirement: Files belong to a workspace
Each file record SHALL belong to the workspace it was uploaded in and record who uploaded it. Listing, reading, confirming or deleting a file from another workspace SHALL return 404 `not_found`.

#### Scenario: File id from another workspace
- **WHEN** a member asks for a download link for a file id from another workspace
- **THEN** the response is 404 `not_found`

### Requirement: Private files are read through short-lived links
Files SHALL be private by default. A member SHALL get a download URL for a ready file in their workspace, valid for 5 minutes. Pending files SHALL return 404 `not_found`. Storage keys SHALL not be guessable.

#### Scenario: Download link expires
- **WHEN** a download URL is used 6 minutes after it was issued
- **THEN** storage refuses the request

#### Scenario: Direct storage access
- **WHEN** someone requests a private file's object without a signed URL
- **THEN** storage refuses the request

### Requirement: Avatars and workspace logos are public
A user's avatar and a workspace's logo SHALL be image files served through a public, cacheable media path. Setting a new one SHALL replace the old one and delete the old object.

#### Scenario: Avatar shown
- **WHEN** a user sets a new avatar
- **THEN** the shell shows it at a public media URL and the previous avatar object is deleted

#### Scenario: Non-image avatar
- **WHEN** a user declares a PDF as their avatar
- **THEN** the response is 400 `invalid_file`

### Requirement: Deleting a file removes its object
Deleting a file SHALL remove its record and its stored object. Deleting an object that is already gone SHALL still succeed.

#### Scenario: Retried delete
- **WHEN** a delete is retried after the object was already removed
- **THEN** the response is success and no error is logged as a failure

### Requirement: Abandoned uploads are cleaned up
Pending files not confirmed within 24 hours SHALL be removed along with any object uploaded for them.

#### Scenario: Upload never confirmed
- **WHEN** a pending file is 25 hours old at the cleanup run
- **THEN** its record and object are removed

### Requirement: Workspace purge removes its files
When a deleted workspace is purged, all its file records and stored objects SHALL be removed, including its logo.

#### Scenario: Purged workspace
- **WHEN** a workspace with 20 files is purged
- **THEN** none of its 20 objects remain in storage
