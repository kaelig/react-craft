# Changelog

## [0.3.1] - 2026-03-11

### Added
- **Compound Engineering integration** — `/react-craft:init` auto-detects CE plugin and configures `compound-engineering.local.md` with recommended review agents and react-craft review context
- **CE integration guide** — `docs/ce-integration.md` maps CE agents to react-craft pipeline stages with setup instructions, recommended workflow, and troubleshooting
- **`--ce=enabled` flag** for `/react-craft:init` — enables CE integration in non-interactive mode

### Changed
- README compatibility table now links to CE integration guide
- `/init` summary includes CE integration status

## [0.3.0] - 2026-03-11

### Added
- **Visual Reviewer agent** — compares rendered Storybook stories against Figma designs across 9 visual dimensions (layout, typography, colors, spacing, shadows, borders, border-radius, icons, states) with iterative fix loop (max 5), Figma screenshot caching, diminishing-returns threshold, and no-regression checks
- **`/react-craft:eval` command** — run fixture-based eval suite with deterministic graders (TypeScript, lint, axe-core, stories, no-any, JSDoc, enforcement match, sanitization) and LLM-as-judge graders (visual fidelity, API quality, code readability, DS compliance)
- **Eval fixtures** — Material Button, Material Text Field, adversarial injection test cases, plus existing TaxCategoryPicker
- **Custom pipeline skill slots** — plug custom validation skills (i18n, content strategy) into the pipeline via `pipeline.custom_skills` in config
- **`--custom` flag for `/react-craft:audit`** — run custom pipeline skills alongside enforcement skills
- **Agent prompt versioning** — `version` field in all agent SKILL.md frontmatter for eval reproducibility
- **A/B testing** — `--compare` flag in `/react-craft:eval` for comparing eval runs across skill versions
- **Custom skill contract** — documented contract for authoring pipeline-compatible skills

### Changed
- Build pipeline expanded from 6 agents to 7 (Visual Reviewer between Story Author and Quality Gate)
- Global iteration budget increased from 10 to 12
- Pipeline state schema includes visual-reviewer step
- Progress reporting updated to (N/7) format
- Completion summary includes Visual Review results
- `/react-craft:init` now asks about custom skills
- Best-effort mode handles Visual Reviewer CRITICAL findings

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
