# UI / UX Rules

## Purpose of this document

This document defines the concrete UI / UX quality bar for Nadif.

The goal is not “clean enough.”
The goal is premium, warm, guided, operational software that feels intentionally designed.

This document exists to stop Claude from defaulting to generic admin SaaS patterns and to make Nadif’s premium standard concrete.

---

## Quality bar

Nadif is not allowed to look like:
- a generic dashboard template
- a black-and-white admin starter kit
- a blank CRUD shell
- a sparse page with a title and one empty state
- a product that is technically correct but emotionally flat

Nadif should feel:
- premium
- calm
- refined
- warm
- spacious
- trustworthy
- guided
- operationally clear
- visually intentional
- modern without being flashy
- premium without luxury gimmicks
- beautiful without decorative clutter

---

## Core design principles

- operational clarity first
- premium visual hierarchy
- guidance over guessing
- spaciousness over compression
- warmth over harsh contrast
- progression over overwhelm
- strong default structure over empty openness
- domain-specific layouts over repeated generic shells
- simple on the surface, powerful underneath

---

## Nadif visual identity

### Default visual direction
Use:
- warm neutrals
- soft surfaces
- restrained accent colors
- elegant contrast
- intentional sectioning
- calm visual rhythm

Do not default to:
- pure black primary surfaces
- harsh grayscale UI
- heavy black pills
- stark white + black-only layouts
- cold enterprise styling

### Default palette direction
Until an official brand system replaces this, default to this tone:

- page background: warm ivory / soft stone
- primary surface: white
- secondary surface: warm off-white
- text primary: deep espresso, not black
- text secondary: muted taupe / stone
- borders: soft beige-gray
- primary accent: sage / muted botanical green
- secondary accent: warm sand / brass / clay
- success: softened green
- warning: muted amber
- danger: softened terracotta / brick

### Color rules
Required:
- primary CTAs should use the accent system, not black
- active navigation should use tinted or soft-filled states, not black slabs
- emphasis should come from hierarchy, spacing, and structure, not only dark fills
- status colors must be readable and not rely on color alone

Avoid:
- solid black as Nadif’s default action color
- black pill navigation as the primary brand expression
- giant gray fields with no warmth
- colorless emptiness
- default monochrome SaaS styling

---

## Typography and hierarchy rules

Required:
- strong page title hierarchy
- supportive subtitle or context line where useful
- section headings that improve scanning
- body text that explains rather than fills space
- obvious visual difference between primary, secondary, and tertiary text

Avoid:
- oversized headings with weak surrounding structure
- tiny body text floating in large empty areas
- pages where hierarchy depends only on font size changes
- using typography alone to fake a premium experience

Premium comes from hierarchy, rhythm, spacing, color, structure, and flow together.

---

## Surface, density, and elevation rules

Nadif should feel refined and layered, not flat or box-stacked.

Required:
- surfaces should have intentional hierarchy
- use soft elevation, tinted backgrounds, and restrained borders
- primary sections should feel anchored and important
- supporting sections should feel quieter but still structured
- density should feel efficient, never cramped

Prefer:
- medium-to-large corner radii
- subtle shadows or soft surface separation
- restrained border use
- layered sections with clear visual priority
- breathing room around important controls and summaries

Avoid:
- flat white boxes everywhere
- every section having the same visual weight
- excessive borders as the main way to create structure
- cramped controls packed tightly together
- oversized padding that creates emptiness without purpose

---

## Layout rules

### General layout
Required:
- use the available screen width intentionally
- avoid narrow operational columns inside large desktop canvases
- create clear page structure with modules, not empty openness
- use split or multi-column layouts when they improve clarity
- keep key context visible without making the page feel cramped

Preferred:
- 12-column thinking for desktop layouts
- generous horizontal padding
- clear top band structure
- meaningful modular sections
- sticky side summaries where useful
- strong alignment across modules

Avoid:
- giant empty center areas
- content awkwardly pinned to the top-left with the rest of the page unused
- tiny cards floating in a sea of whitespace
- pages that feel unfinished because nothing anchors the layout

### Top band rule
Most staff pages should begin with a strong top band that includes:
- page title
- one-sentence context
- primary action
- supporting context such as status, counts, onboarding progress, filters, or view controls

Do not start important pages with only a title and a lone button.

---

## Page archetypes

Every page must follow a defined archetype.

### 1) Dashboard
A dashboard must not be a blank greeting and a couple of loose cards.

A Nadif dashboard should usually include:
- welcome or business context
- onboarding or setup progress when relevant
- quick actions
- business health snapshot
- recent or upcoming operational items
- recommended next steps
- helpful system guidance for first-time users

The first screen should help the user understand:
- where they are
- how set up they are
- what deserves attention
- what they should do next

### 2) Collection / index page
Examples:
- bookings
- customers
- services
- providers
- quotes

A collection page must not be:
- title
- filter pills
- centered empty state
- huge blank page

Required structure:
- top band
- view controls, filters, or tabs
- meaningful body area
- contextual empty state or populated list/grid
- domain-specific guidance when empty

When empty, the page should still teach the domain.

Example expectations:
- Bookings should explain how bookings enter the system and what the first booking enables
- Customers should explain records, properties, and future booking value
- Services should explain service catalog structure, pricing logic, and starter setup
- Quotes should explain quote lifecycle, conversion, and follow-up value

### 3) Command center / detail page
For operational work, prefer:
- main content area
- sticky summary or action rail
- visible status and timeline context
- focused sections
- high-confidence primary actions
- editing that feels deliberate, not scattered

These pages should feel like operating consoles, not long documents.

### 4) Setup / settings page
Settings must not feel like a dull left-nav and a blank content void.

Required:
- category navigation
- clear explanation of what the selected category controls
- grouped settings by mental model
- examples, previews, or policy summaries when helpful
- starter guidance when empty
- clear distinction between configuration and effect

The user should understand:
- what this setting impacts
- why it matters
- what happens if they change it

### 5) Multi-step flow / wizard
Required:
- visible progress
- step titles users can understand
- calm pacing
- summary visibility where helpful
- progressive disclosure
- contextual helper text
- confidence-building feedback

Avoid:
- overwhelming all-in-one forms
- hidden dependencies
- weak summaries
- abrupt jumps in complexity

---

## Collections, rows, and table behavior

Operational collections should feel easy to scan, not like generic admin grids.

Preferred:
- structured list rows over heavy boxed cards when reviewing many records
- strong row hierarchy with obvious primary information
- visible status, timing, value, and next action where relevant
- filters and views that feel integrated into the page, not bolted on
- list layouts that support fast scanning and quick action

Use tables only when:
- comparison across columns is genuinely important
- the user needs dense operational review
- the table improves speed more than a structured list would

When using tables:
- keep row density readable
- preserve critical identifying context when helpful
- avoid overly technical column naming
- ensure primary actions remain obvious
- prevent the table from becoming the entire product experience

Avoid:
- defaulting to generic enterprise tables
- full-page tables with weak hierarchy
- rows that make every record feel visually identical
- giant card grids when the user really needs scanning speed

---

## Empty state rules

Empty states are not placeholders.
They are designed product moments.

### Every important empty state should include
- a clear headline
- a plain-language explanation
- why this matters
- a strong primary action
- a useful secondary action when appropriate
- confidence about what happens next

### For foundational staff pages, empty states should often include one or more of:
- starter templates
- recommended first setup actions
- import option
- “see example” or preview content
- explanation of how this domain connects to the rest of the business

### Not allowed
- an icon, one sentence, and a lone button floating in empty space
- the same empty state pattern repeated across every domain
- empty states that explain nothing
- empty states with no recovery path

---

## Foundational first-use page recipe

When a foundational staff page has no real data yet, the default page anatomy should usually include:

1. top band with page purpose and primary action
2. short explanation of why this domain matters
3. guided setup or starter module
4. optional example, template, or import path
5. secondary educational or preview module
6. confidence about what happens after setup

Examples:
- Services should teach service catalog setup, pricing impact, and provide starter actions
- Customers should explain records, properties, and future booking value
- Bookings should explain where bookings come from and what operational value begins after the first one
- Quotes should explain lifecycle, conversion, and follow-up value

Do not reduce foundational pages to:
- title
- one CTA
- one empty state

---

## Hand-holding standard

Nadif should guide the user naturally.

Required:
- plain-language helper text
- contextual explanations
- smart defaults
- clear cause-and-effect language
- safe fallbacks
- next-best-action guidance
- progressive disclosure for advanced controls

Do not assume the user knows:
- Nadif vocabulary
- configuration consequences
- setup order
- why the page exists
- what happens after they click the CTA

---

## Form and configuration rules

Forms must feel guided, not bureaucratic.

Required:
- clear labels
- supportive helper text where decisions matter
- grouping by mental model
- inline validation
- field-level errors
- clear required vs optional treatment
- human wording
- examples when configuration could be misunderstood

Avoid:
- giant field walls
- generic stacked inputs with no story
- settings soup
- technical-only language
- unclear dependencies between controls

---

## Settings architecture rules

Settings should feel like guided configuration, not a warehouse of toggles.

Required:
- each settings category should begin with a short explanation of what it controls
- settings should be grouped by mental model, not by backend schema
- important settings should explain downstream effect
- risky settings should include warnings, examples, or policy summaries
- configuration and preview should appear together when helpful

Prefer:
- stable category navigation
- short contextual intros at the top of each settings section
- preview or example modules for branding, automations, pricing, and customer-facing effects
- summary callouts for what is currently active or important

Avoid:
- long toggle walls
- categories with no explanation
- backend-shaped grouping that users would not naturally expect
- forms where the user cannot tell what changing the setting will do

---

## Buttons, cards, and controls

### Buttons
Required:
- one obvious primary action
- secondary actions visually quieter
- destructive actions clearly distinct
- button styling aligned to the accent system, not black defaults

### Cards
Use cards only when they help grouping or emphasis.
Do not use cards as the default answer to every page.

Avoid:
- random card mosaics
- tiny cards floating in large empty spaces
- using cards to compensate for weak layout structure

### Navigation
Active nav should feel premium and integrated.

Prefer:
- tinted active backgrounds
- subtle emphasis
- strong label clarity
- restrained contrast

Avoid:
- hard black active pills as the main design language
- overly heavy sidebar visuals

---

## Staff surface patterns

For staff/admin surfaces, prefer:
- command-center layouts
- clear top bands
- setup guidance when empty
- summary rails for pricing- or status-heavy workflows
- drawers or side panels for secondary editing
- visible progress for onboarding or setup
- domain-specific structure instead of copy-pasted shells

### Foundational domain pages must not feel interchangeable
Bookings, Customers, Services, Settings, and Dashboard should each feel meaningfully distinct in:
- structure
- guidance
- supporting modules
- empty-state behavior
- action framing

---

## Premium desktop behavior

Desktop space is not permission to leave the page empty.

Use desktop width to add:
- better structure
- summary rails
- guidance panels
- previews
- onboarding modules
- helpful supporting information

Do not use desktop width to simply spread small amounts of content farther apart.

---

## Mobile and responsive behavior rules

Nadif should remain premium and guided on smaller screens.

Required:
- layouts should stack intentionally, not collapse awkwardly
- sticky summary content should become bottom summaries, drawers, or compact sections when needed
- actions must remain obvious and reachable
- section order should reflect priority, not desktop order only
- long forms and setup screens should break into clearer grouped sections on mobile

Prefer:
- drawers or sheets for secondary editing
- progressive disclosure for advanced controls
- shorter content bursts per section
- persistent progress or summary cues for multi-step flows

Avoid:
- shrinking desktop layouts without restructuring
- tiny side panels squeezed into mobile widths
- wide row layouts that become unreadable when stacked
- hiding critical context that the user still needs to complete the task

---

## Motion and interaction polish

Premium software should feel responsive and intentional in motion.

Required:
- hover, focus, and pressed states should feel deliberate
- loading transitions should reduce abrupt jumps
- drawers, modals, and sheets should feel smooth and anchored
- success, pending, and saving states should be visible without feeling noisy
- step-to-step transitions in flows should reinforce progress and confidence

Prefer:
- subtle motion
- calm transitions
- responsive visual feedback
- micro-interactions that clarify interaction rather than decorate it

Avoid:
- abrupt state changes with no feedback
- flashy animation
- motion that slows down operational work
- important state changes happening invisibly

---

## Loading, success, and error rules

Required:
- polished loading states
- clear success confirmation
- visible pending state when something is processing
- error states with explanation and recovery path
- disabled states that explain why action is unavailable when needed

Avoid:
- silent failures
- invisible save state
- generic error copy
- pages that visually collapse when data is missing

---

## Specific forbidden patterns

Do not ship:
- title + CTA + centered empty state in a blank page
- black primary CTA system
- black active navigation pills as the default Nadif look
- repeated generic page shells across domains
- massive unused whitespace without supporting modules
- raw CRUD pages presented as premium product design
- settings pages with no explanation of impact
- empty states that do not teach or guide
- onboarding that feels like a checklist pasted into a dashboard
- pages that look calm only because almost nothing is on them

---

## Required UI review before calling a page done

Claude must be able to explain:

1. why this page does not feel like a generic admin template
2. why the layout uses desktop width intentionally
3. what the user understands within 5 seconds
4. what the next best action is
5. how the empty state teaches, not just blocks
6. why the color and hierarchy feel premium
7. how this page differs structurally from other domains

If those answers are weak, the page is not done.

---

## Definition of UI / UX success

A Nadif surface is successful when:
- it looks premium
- it feels warm and intentional
- the next step is obvious
- the layout uses space intelligently
- the page teaches the user what matters
- the surface feels specific to its domain
- the product feels more trustworthy because of the design