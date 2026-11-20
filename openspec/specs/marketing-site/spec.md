# marketing-site Specification

## Purpose

Gives each product a public website in the source product's design: landing, pricing from the plan definition, legal pages, blog and changelog from the CMS, and the metadata search engines and link previews need.

## Requirements

### Requirement: Public pages need no sign-in
The landing, pricing, legal, blog, changelog, help and contact pages SHALL render for signed-out visitors without reading a session from the database.

#### Scenario: Anonymous visit
- **WHEN** a signed-out visitor opens the pricing page
- **THEN** it renders without redirecting to sign-in

#### Scenario: Signed-in header
- **WHEN** a signed-in user opens the landing page
- **THEN** the header offers a link to the app instead of sign-in

### Requirement: Marketing shell
Every public page SHALL use the marketing shell: header with navigation and sign-in and sign-up actions, footer with legal links and support email, and a mobile navigation menu on small screens.

#### Scenario: Mobile navigation
- **WHEN** a public page is opened on a narrow screen
- **THEN** the header shows a menu button that opens the navigation

### Requirement: Pricing comes from the plan definition
The pricing page SHALL show every plan from the plan definition with its monthly and yearly price, trial length, limits and features. Its buttons SHALL lead to sign-up.

#### Scenario: Plan price changed
- **WHEN** a developer changes a plan's yearly price in the plan definition
- **THEN** the pricing page shows the new price with no other edit

### Requirement: Content comes from the CMS
Blog posts, legal pages and changelog entries SHALL come from the CMS. A list with no entries SHALL show an empty state, and an unknown slug SHALL return the 404 page.

#### Scenario: No blog posts yet
- **WHEN** the CMS has no blog posts
- **THEN** the blog page renders with the empty state

#### Scenario: Unknown post
- **WHEN** a visitor opens `/blog/does-not-exist`
- **THEN** the 404 page is shown with status 404

### Requirement: Page metadata
Every public page SHALL have a title, description and canonical URL on the app origin, and Open Graph and Twitter card tags with a generated preview image that shows the page title and product branding.

#### Scenario: Blog post shared
- **WHEN** a blog post URL is pasted into a chat app
- **THEN** the preview shows the post title, description and a generated image with that title

### Requirement: Sitemap and robots
The site SHALL serve a sitemap listing every public page and every published blog post and changelog entry, and a robots file that points to it and excludes app, admin and API paths.

#### Scenario: New post published
- **WHEN** a blog post is published in the CMS
- **THEN** the sitemap lists its URL

#### Scenario: App paths excluded
- **WHEN** the robots file is fetched
- **THEN** it disallows the app, admin and API paths

### Requirement: Structured data
Public pages SHALL include structured data: organization and website on every page, blog posting on each post, and product offers matching the plan prices on the pricing page.

#### Scenario: Pricing structured data
- **WHEN** the pricing page is validated with a structured data tester
- **THEN** it reports one offer per plan and interval with the price from the plan definition

### Requirement: Product-specific pieces are replaced, not removed
Sections the source used for product-specific input SHALL be kept in the same design with generic content; the landing hero SHALL end in a sign-up call to action.

#### Scenario: Landing hero
- **WHEN** the landing page renders
- **THEN** the hero has the source's layout and its main action opens sign-up
