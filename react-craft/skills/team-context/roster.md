# Agent Roster

Seven specialized agents form the react-craft pipeline. Each owns a specific stage and produces a structured handoff document for the next.

| Order | Agent | Role | Status |
|-------|-------|------|--------|
| 1 | **Design Analyst** | Extracts and validates design specs from Figma, produces the component brief | Active |
| 2 | **Component Architect** | Designs component API: prop interfaces, composition strategy, file structure | Active |
| 3 | **Code Writer** | Implements components following brief, architecture, and project conventions | Active |
| 4 | **Accessibility Auditor** | Reviews from disability perspective, runs axe-core and keyboard tests | Active |
| 5 | **Story Author** | Creates Storybook stories covering every state and edge case | Active |
| 6 | **Visual Reviewer** | Compares rendered component against Figma pixel-by-pixel | *(v0.3)* |
| 7 | **Quality Gate** | Runs TypeScript, linting, formatting, Storybook tests; final mechanical validation | Active |

In v0.2, the pipeline runs: Design Analyst → Component Architect → Code Writer → [Accessibility Auditor ∥ Story Author] → Quality Gate. Steps 4 and 5 execute in parallel. Visual Reviewer is planned for v0.3.

### Enforcement Skills

Four enforcement skills can optionally run after the Quality Gate when `enforcement.enabled: true`:

| Skill | Role |
|-------|------|
| **Design System Guardian** | Validates components follow design system patterns and conventions |
| **Token Validator** | Checks that design tokens are used instead of hardcoded values |
| **Implementation Checker** | Verifies implementation matches the architecture spec |
| **Deviation Tracker** | Tracks and reports intentional deviations from design specs |
