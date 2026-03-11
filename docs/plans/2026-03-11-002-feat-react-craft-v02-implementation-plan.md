---
title: "feat: React Craft v0.2 — New Agents, Enforcement Skills, Hooks, References"
type: feat
status: completed
date: 2026-03-11
origin: docs/brainstorms/2026-03-10-react-craft-brainstorm.md
deepened-plan: docs/plans/2026-03-10-react-craft-plan-deepened.md
v01-plan: docs/plans/2026-03-11-001-feat-react-craft-v01-implementation-plan.md
scope: v0.2
---

# React Craft v0.2 — Implementation Plan

## Overview

Extend the v0.1 plugin (4-agent pipeline) with 2 new agents, 4 enforcement skills, hooks infrastructure, and reference knowledge docs. This brings the pipeline from "generates code" to "generates tested, accessible, design-system-compliant code."

### What's New in v0.2

| Feature | What It Does |
|---------|-------------|
| **Accessibility Auditor** | 8-layer a11y testing: eslint-plugin-jsx-a11y → axe-core → screen reader → Storybook a11y → Playwright keyboard/contrast |
| **Story Author** | Storybook 10 CSF Factories stories with interaction tests for every state, edge case, and a11y scenario |
| **Enforcement Skills** | Guardian, Token Validator, Implementation Checker, Deviation Tracker — ported from prior toolkit |
| **`/react-craft:audit`** | Run enforcement skills against existing or generated components |
| **Hooks** | Auto-trigger checks on file edit, commit, and agent completion events |
| **Reference Skills** | Bundled knowledge docs for React, a11y, Storybook, responsive, motion, component API patterns |

### What's NOT in v0.2

- Visual Reviewer agent (deferred to v0.3)
- Eval infrastructure (v0.3)
- Batch mode / concurrent builds
- Custom pipeline skill slots

### Key Decisions from v0.1

- Agents are skill directories with `SKILL.md` + `reference.md` (not bare `.md` files)
- `user-invocable: false` for pipeline agents
- Pipeline orchestrated by `build.md` command, not agent routing
- Artifact chain: each agent writes to `docs/react-craft/components/<ComponentName>/`
- `--best-effort` flag for autonomous pipeline runs
- `--resume` for mid-pipeline recovery

---

## Phase 1: Accessibility Auditor Agent

> **Goal:** Deep interactive a11y audit integrated into the `/build` pipeline.

### Boundary with Other Agents

- **Accessibility Auditor (this):** Deep interactive audit — axe-core, keyboard testing, screen reader verification, contrast checks. Runs during creation.
- **Implementation Checker (Phase 3):** Static pattern matching only — missing ARIA, missing `prefers-reduced-motion`, missing focus-visible. Runs during enforcement/audit.
- **Quality Gate:** Only validates that `storybook test` passes (binary). No a11y findings of its own.

### Tasks

- [x] **1.1** Create `skills/accessibility-auditor/SKILL.md` with frontmatter:
  ```yaml
  ---
  name: accessibility-auditor
  description: Reviews generated components for WCAG 2.2 compliance using automated testing (axe-core, keyboard, screen reader) and produces actionable findings. Use after code generation in the react-craft pipeline.
  user-invocable: false
  ---
  ```

- [x] **1.2** Create `skills/accessibility-auditor/reference.md` with:
  - 8-layer testing stack reference (which tools, what each layer catches)
  - WCAG 2.2 AA quick-reference checklist
  - ARIA authoring practices for common component patterns
  - Keyboard interaction patterns per WAI-ARIA APG
  - Headless library optimization rules (skip tests handled by react-aria/Radix)
  - Manual review checklist template (the ~45% of WCAG that can't be automated)

- [x] **1.3** 8-layer a11y testing process:
  1. **eslint-plugin-jsx-a11y** (ms) — static JSX analysis
  2. **axe-core + JSDOM** (~1s) — structural ARIA checks
  3. **@guidepup/virtual-screen-reader** (~1s) — screen reader announcements
  4. **Storybook a11y addon + Vitest** (~5s) — full axe audit with rendering
  5. **@axe-core/playwright** (~5s) — full WCAG 2.2 AA automated checks
  6. **Playwright keyboard tests** (~5s) — tab order, focus traps, Escape, focus restoration
  7. **Playwright contrast check** (~5s) — rendered contrast, focus indicators
  8. **Generated manual review checklist** — for human follow-up

  Layers 1-5 run on every component. Layers 6-7 run if Storybook and Playwright are available. Layer 8 always produces a checklist artifact.

- [x] **1.4** Headless library optimization: when component uses react-aria or Radix (detected from `architecture.md`), reduce test matrix:
  - Skip: focus management, keyboard patterns, ARIA attributes (handled by library)
  - Always test: color contrast, content labels, custom behavior, composition, focus indicators

- [x] **1.5** WCAG level from config: read `accessibility.target_level` (default: AA). Support A, AA, AAA. Configure axe-core tags accordingly.

- [x] **1.6** Severity classification:
  - **P1 (blocker):** Missing keyboard access, missing ARIA role, contrast below threshold, no focus indicator
  - **P2 (should fix):** Suboptimal ARIA, redundant attributes, missing `prefers-reduced-motion`
  - **P3 (enhancement):** AAA improvements, screen reader UX refinements

- [x] **1.7** P1 findings trigger automatic Code Writer remediation (max 3 attempts, same bail-on-identical logic as Quality Gate). Pass only failure diffs, not full report.

- [x] **1.8** Terminal state: when remediation exhausted, produce component with `[UNRESOLVED]` section in `a11y-report.md` listing remaining P1 issues. Do NOT fail silently or roll back.

- [x] **1.9** Output: `docs/react-craft/components/<ComponentName>/a11y-report.md` with:
  - Findings table (severity, rule, element, suggestion)
  - Manual review checklist
  - Actions taken (auto-fixed items)
  - Unresolved items (if any)

- [x] **1.10** Gate: block pipeline if any P1 findings remain unresolved, UNLESS `--best-effort` is set. In best-effort: log as `[UNRESOLVED_A11Y]` and continue.

### Deliverable
Accessibility Auditor runs after Code Writer, produces actionable findings, and triggers remediation for P1 issues.

---

## Phase 2: Story Author Agent

> **Goal:** Generate Storybook 10 stories with interaction tests for every component state and edge case.

### Tasks

- [x] **2.1** Create `skills/story-author/SKILL.md` with frontmatter:
  ```yaml
  ---
  name: story-author
  description: Creates Storybook 10 stories with interaction tests covering every state, variant, and edge case. Use after code generation and a11y audit in the react-craft pipeline.
  user-invocable: false
  ---
  ```

- [x] **2.2** Create `skills/story-author/reference.md` with:
  - CSF Factories pattern (`config()` from Storybook 10, not legacy `Meta<typeof>`)
  - Play function API with `canvas` and `step` types
  - Interaction test patterns (click, type, hover, keyboard nav)
  - A11y test story pattern (uses addon-a11y)
  - Edge case story patterns (long text, empty, RTL, overflow)
  - Responsive story patterns (viewport parameters for mobile/tablet/desktop)

- [x] **2.3** Input: `brief.md` + generated component files + `architecture.md` + `a11y-report.md` + `react-craft.config.yaml`

- [x] **2.4** Story generation process:
  - Create stories for EVERY state listed in `brief.md` (default, hover, focus, active, disabled, loading, error, empty)
  - Cover all variants with default args
  - Write interaction tests using `@storybook/test` play functions
  - Include a11y test story (uses addon-a11y `expect(canvas).toHaveNoViolations()`)
  - Test responsive behavior at breakpoints
  - Test edge cases: long content, empty content, overflow, RTL if applicable

- [x] **2.5** CSF Factories TypeScript patterns:
  ```typescript
  import { config, fn } from '@storybook/test';
  const { meta, story } = config({ component: Button, args: { onClick: fn() } });
  export default meta;
  export const Primary = story({ args: { variant: 'primary', children: 'Click me' } });
  ```
  Zero-`any` rule applies to story args. If a story can't express args without `any`, flag the component prop interface.

- [x] **2.6** Keyboard navigation test stories:
  - Tab order verification
  - Focus trap testing (modals, dialogs)
  - Escape key dismissal
  - Focus restoration after close

- [x] **2.7** Query Context7 for Storybook 10 CSF Factories docs before generating stories. Verify play function API and types.

- [x] **2.8** Output: `<ComponentName>.stories.tsx` in the project's stories directory (from config or co-located with component)

- [x] **2.9** Verification: run `npx storybook test` via CLI; all stories must render without errors

- [x] **2.10** Gate: if stories fail to render, re-attempt (max 2 tries). In `--best-effort`: log failing stories and continue.

### Deliverable
Story Author produces comprehensive Storybook stories with interaction tests for every documented state, variant, and edge case.

---

## Phase 3: Enforcement Skills (Port from Prior Toolkit)

> **Goal:** Port the 4 enforcement skills from `../2026-03-05-bmad-vs-ce/` and create the `/react-craft:audit` command.
> **Source:** `../2026-03-05-bmad-vs-ce/skills/` and `../2026-03-05-bmad-vs-ce/workflows/frontend-review/`

### Tasks

- [x] **3.1** Port `design-system-guardian` skill:
  - Copy `../2026-03-05-bmad-vs-ce/skills/design-system-guardian/` → `react-craft/skills/design-system-guardian/`
  - Adapt SKILL.md frontmatter to match react-craft conventions (`user-invocable: false`)
  - Update references to read from `react-craft.config.yaml` instead of `.frontend-toolkit.yaml`
  - Use full name `design-system-guardian` (not shortened `guardian`) per pattern convention

- [x] **3.2** Port `token-validator` skill:
  - Copy and adapt from prior toolkit
  - Add DTCG `.tokens.json` support as primary format
  - Read token sources from config

- [x] **3.3** Port `implementation-checker` skill:
  - Copy and adapt — static pattern matching only (clear boundary with Accessibility Auditor)
  - Checks: missing ARIA attributes, missing `prefers-reduced-motion`, missing focus-visible styles, hardcoded colors/spacing

- [x] **3.4** Port `deviation-tracker` skill:
  - Copy and adapt — classification + YAML reports + `@ds-deviation` comment parsing
  - Add DS team nudge: all `needs-review` findings include `support_channel` URL from config
  - Nudge text: "Not sure if this is intentional? Check with the DS team: {support_label} ({support_channel})"

- [x] **3.5** Create `/react-craft:audit` command (`commands/react-craft/audit.md`):
  ```yaml
  ---
  name: react-craft:audit
  description: Run enforcement skills against existing or generated components to validate design system compliance
  argument-hint: "<path|glob> [--fix] [--severity=warning]"
  disable-model-invocation: true
  allowed-tools: Read, Glob, Grep, Write, Edit, Bash(npx *)
  ---
  ```

- [x] **3.6** Audit scope: accepts a file path, directory, or glob pattern. Works on both react-craft-generated AND hand-written components.

- [x] **3.7** Audit runs enforcement skills in order: Guardian → Token Validator → Implementation Checker → Deviation Tracker

- [x] **3.8** Custom skill error handling: if a skill crashes or returns malformed output, log error, skip skill, continue with warning in final report.

- [x] **3.9** Port `examples/react-component/TaxCategoryPicker.tsx` + `EXPECTED_FINDINGS.md` as eval fixture in `react-craft/examples/`

- [x] **3.10** Port `examples/custom-skills/i18n-checker/` as a bundled example custom skill

### Deliverable
`/react-craft:audit <path>` runs 4 enforcement skills and produces an actionable compliance report. Prior toolkit examples ported as test fixtures.

---

## Phase 4: Update Build Pipeline for v0.2

> **Goal:** Extend the 4-agent pipeline to 6 agents with parallel execution for a11y + stories.

### Tasks

- [x] **4.1** Update `commands/react-craft/build.md` pipeline to:
  ```
  Design Analyst → Component Architect → Code Writer → [Accessibility Auditor ∥ Story Author] → Quality Gate
  ```
  A11y Auditor and Story Author run in parallel after Code Writer.

- [x] **4.2** Handle parallel agent race condition: if a11y triggers Code Writer remediation, discard Story Author output and re-run stories after remediation completes.

- [x] **4.3** Update pipeline-state.yaml schema to track new agents:
  ```yaml
  steps:
    design-analyst: { status: completed }
    component-architect: { status: completed }
    code-writer: { status: completed }
    accessibility-auditor: { status: completed }
    story-author: { status: completed }
    quality-gate: { status: pending }
  ```

- [x] **4.4** Update Quality Gate to also run `storybook test --ci` (if Storybook is configured)

- [x] **4.5** Wire enforcement skills into `/build` as post-Quality-Gate validation (optional, enabled in config)

- [x] **4.6** Add `--dry-run` flag: run Design Analyst and Component Architect only, producing brief + architecture without generating code

- [x] **4.7** Add progress reporting: `[react-craft] (3/6) Code Writer: generating Button.tsx...`

- [x] **4.8** Update global iteration budget from 6 to 10 (more agents = more potential remediation)

- [x] **4.9** Update `allowed-tools` in build.md if needed for new agent capabilities

### Deliverable
6-agent pipeline with parallel a11y + story execution, Storybook test verification, and optional enforcement.

---

## Phase 5: Hooks Infrastructure

> **Goal:** Auto-trigger checks on Claude Code lifecycle events.

### Tasks

- [x] **5.1** Create `react-craft/hooks/hooks.json`:
  ```json
  {
    "hooks": {
      "PostToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [{
            "type": "command",
            "command": "FILE=\"$TOOL_INPUT_FILE_PATH\"; if echo \"$FILE\" | grep -qE '\\.(tsx|jsx|css|scss)$'; then HITS=$(grep -n '#[0-9a-fA-F]\\{3,8\\}' \"$FILE\" 2>/dev/null | head -3); if [ -n \"$HITS\" ]; then echo '[react-craft] Potential hardcoded colors:'; echo \"$HITS\"; echo 'Consider running /react-craft:audit'; fi; fi"
          }]
        }
      ],
      "PreToolUse": [
        {
          "matcher": "Bash",
          "hooks": [{
            "type": "command",
            "command": "if echo \"$TOOL_INPUT_COMMAND\" | grep -q 'git commit'; then UI_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\\.(tsx|jsx|css|scss)$' | head -5); if [ -n \"$UI_FILES\" ]; then echo '[react-craft] UI files in commit:'; echo \"$UI_FILES\"; echo 'Run /react-craft:audit for DS compliance.'; fi; fi"
          }]
        }
      ]
    }
  }
  ```

- [x] **5.2** Add optional `SubagentStop` hook pattern: document how to auto-trigger Accessibility Auditor after Code Writer completes (if supported by Claude Code version)

- [x] **5.3** Update `/react-craft:init` to add CLAUDE.md instructions for semantic hooks:
  ```markdown
  ## After Editing UI Files
  After editing any .tsx, .jsx, .css, or .scss file, run the token-validator
  skill to check for hardcoded values before proceeding.
  ```

- [x] **5.4** Document hook customization in README: how to add/remove/modify hooks

- [x] **5.5** All hook commands use sanitization patterns (no Figma data or user input in hook commands)

### Deliverable
Hooks auto-fire on file edit and commit events. Deterministic shell checks complement the semantic CLAUDE.md instructions.

---

## Phase 6: Reference Skills

> **Goal:** Bundled knowledge docs serving as offline fallback when Context7 is unavailable.

### Tasks

- [x] **6.1** Create `skills/references/SKILL.md`:
  ```yaml
  ---
  name: references
  description: Bundled reference knowledge for React, accessibility, Storybook, responsive design, motion, and component API patterns. Loaded on-demand by agents as offline fallback.
  user-invocable: false
  ---
  ```

- [x] **6.2** Create reference docs in `skills/references/`:
  - `react-patterns.md` — React 18/19 patterns (composition, hooks, refs, portals, suspense)
  - `accessibility.md` — WCAG 2.2 checklist, ARIA authoring practices, keyboard patterns per WAI-ARIA APG
  - `storybook-testing.md` — Storybook 10 CSF Factories, play functions, a11y addon, `canvas`/`step` types
  - `responsive-mobile-first.md` — Mobile-first breakpoints, native features, container queries
  - `motion-animation.md` — Functional animation patterns, reduce-motion, CSS vs JS transitions
  - `component-api-design.md` — Prop naming, compound components, polymorphic `as` prop, discriminated unions, event handler typing

- [x] **6.3** TypeScript patterns in `component-api-design.md`:
  - Canonical polymorphic `as` prop pattern with `PolymorphicProps<E, P>`
  - forwardRef with generics pattern
  - Discriminated union vs boolean flag examples
  - Event handler typing (`React.MouseEventHandler<HTMLElement>`)

- [x] **6.4** Storybook patterns in `storybook-testing.md`:
  - CSF Factories `config()` pattern
  - Play function examples with `canvas` and `step`
  - `satisfies` patterns for story objects

- [x] **6.5** Each reference starts with a TOC section index for partial loading. Each includes a knowledge-cutoff header: "Verify against Context7 when available."

- [x] **6.6** References loaded on-demand by the relevant agent (not all at once)

### Deliverable
Rich reference library usable offline. Each agent loads only the reference it needs.

---

## Phase 7: Update README + Docs

> **Goal:** Update README and CHANGELOG for v0.2 release.

### Tasks

- [x] **7.1** Update README:
  - Pipeline diagram: 6 agents (not 4)
  - New commands: `/react-craft:audit`
  - New flags: `--dry-run`
  - A11y testing stack description
  - Storybook integration section
  - Hooks section
  - Updated roadmap (v0.2 → current, v0.3 → Visual Reviewer + eval)
  - Known limitations updated

- [x] **7.2** Update CHANGELOG.md with v0.2 entries

- [x] **7.3** Update team-context roster.md: mark Accessibility Auditor and Story Author as active

- [x] **7.4** Update plugin.json version to `0.2.0`

- [x] **7.5** Remove "(coming in v0.2)" annotation from init.md CLAUDE.md template for `/react-craft:audit`

### Deliverable
Documentation reflects v0.2 capabilities accurately.

---

## Swarm Assignment

```
Phase 1 (a11y auditor) ──┐
Phase 2 (story author) ──┤── can run in parallel (independent agents)
Phase 3 (enforcement) ───┤
Phase 5 (hooks) ──────────┤
Phase 6 (references) ─────┘
         │
         ▼
Phase 4 (update build pipeline) ── needs phases 1-2
Phase 7 (update README) ────────── needs all phases
```

| Agent | Phase | Depends On |
|-------|-------|------------|
| **Agent 1: A11y Auditor** | Phase 1 (1.1-1.10) | v0.1 complete |
| **Agent 2: Story Author** | Phase 2 (2.1-2.10) | v0.1 complete |
| **Agent 3: Enforcement** | Phase 3 (3.1-3.10) | v0.1 complete |
| **Agent 4: Hooks** | Phase 5 (5.1-5.5) | v0.1 complete |
| **Agent 5: References** | Phase 6 (6.1-6.6) | v0.1 complete |
| **Agent 6: Pipeline + Docs** | Phase 4 + Phase 7 | Agents 1-5 |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-10-react-craft-brainstorm.md](docs/brainstorms/2026-03-10-react-craft-brainstorm.md)
- **Deepened plan (phases 3.4, 3.5, 5, 6, 7):** [docs/plans/2026-03-10-react-craft-plan-deepened.md](docs/plans/2026-03-10-react-craft-plan-deepened.md)
- **v0.1 plan:** [docs/plans/2026-03-11-001-feat-react-craft-v01-implementation-plan.md](docs/plans/2026-03-11-001-feat-react-craft-v01-implementation-plan.md)
- **Prior toolkit:** `../2026-03-05-bmad-vs-ce/skills/` (Guardian, Token Validator, Implementation Checker, Deviation Tracker)
