# Changelog

## [0.2.0] - 2026-03-11

### Added
- **Accessibility Auditor agent** — 8-layer a11y testing stack (static analysis, axe-core, keyboard nav, screen reader, contrast, focus management, reduced motion, touch targets)
- **Story Author agent** — generates Storybook stories covering all component states, variants, and edge cases
- **Parallel execution** — Accessibility Auditor and Story Author run simultaneously after Code Writer
- **P1 remediation flow** — blocker a11y findings trigger automatic Code Writer remediation with story regeneration
- **`/react-craft:audit` command** — run enforcement skills against existing components
- **Enforcement skills** — Design System Guardian, Token Validator, Implementation Checker, Deviation Tracker
- **`--dry-run` flag** — run Design Analyst and Component Architect only (brief + architecture without code)
- **Storybook test in Quality Gate** — runs `npx storybook test --ci` when Storybook is configured
- **Optional enforcement after Quality Gate** — configurable via `enforcement.enabled` in config
- **Progress reporting** — `[react-craft] (N/6) AgentName: description...` for each pipeline step
- **Shell hooks** — PostToolUse hooks for hardcoded color detection, PreToolUse hook for commit-time audit reminders
- **Reference docs** — a11y patterns, Storybook best practices, design token guidance

### Changed
- Build pipeline expanded from 4 agents to 6 (Visual Reviewer deferred to v0.3)
- Global iteration budget increased from 6 to 10
- Pipeline state schema includes accessibility-auditor and story-author steps
- Completion summary now includes a11y report, story count, and enforcement results

## [0.1.0] - 2026-03-10

### Added
- Plugin scaffold with skill directories
- Team charter and roster
- Component brief and architecture templates
- `/react-craft:init` command
- `/react-craft:build` command
- Design Analyst, Component Architect, Code Writer, Quality Gate agents
