---
title: "feat: React Craft v0.3 — Visual Reviewer, Eval Infrastructure, Custom Pipeline"
type: feat
status: completed
date: 2026-03-11
origin: docs/brainstorms/2026-03-10-react-craft-brainstorm.md
deepened-plan: docs/plans/2026-03-10-react-craft-plan-deepened.md
v01-plan: docs/plans/2026-03-11-001-feat-react-craft-v01-implementation-plan.md
v02-plan: docs/plans/2026-03-11-002-feat-react-craft-v02-implementation-plan.md
scope: v0.3
---

# React Craft v0.3 — Implementation Plan

## Overview

Complete the 7-agent pipeline with the Visual Reviewer, add eval infrastructure for measurable quality tracking, and enable custom pipeline skill slots. This brings react-craft from "generates tested, accessible code" to "generates visually verified code with measurable quality benchmarks."

### What's New in v0.3

| Feature | What It Does |
|---------|-------------|
| **Visual Reviewer agent** | Screenshot Figma vs Storybook, compare across 9 dimensions, iterative fix loop (max 5), cached reference screenshots |
| **`/react-craft:eval` command** | Run fixture suite with deterministic + LLM-as-judge graders, produce scored benchmark reports |
| **Eval fixtures** | Snapshotted Anova YAML exports from Material Design, Apple HIG, and adversarial test cases |
| **Custom pipeline skill slots** | Plug in custom skills (i18n, content strategy, etc.) via `skill: custom` in config |
| **Agent prompt versioning** | Each agent carries a version identifier for eval reproducibility |

### What's NOT in v0.3

- Batch mode / concurrent builds
- Figma-to-code drift detection (documented extension point)
- Documentation site / GitHub Pages (v0.4)
- GitHub Actions CI for eval-on-PR (v0.4)
- Demo video (v0.4)

### Key Decisions Carried Forward (see brainstorm: docs/brainstorms/2026-03-10-react-craft-brainstorm.md)

- Agents are skill directories with `SKILL.md` + `reference.md`
- Pipeline orchestrated by `build.md` command, not agent routing
- `--best-effort` flag for autonomous pipeline runs
- Eval fixtures are snapshotted static files (Anova YAML exports), not live Figma links
- Custom skills follow the finding-format contract: `[SEVERITY] file:line — category`
- Visual Reviewer is the biggest token sink (25K-60K per component) — caching and diminishing-returns thresholds are critical

---

## Phase 1: Visual Reviewer Agent

> **Goal:** Complete the 7th and final creation agent — pixel-perfect visual comparison between Figma designs and rendered Storybook stories.

### Boundary with Other Agents

- **Visual Reviewer (this):** Screenshot-based pixel comparison across 9 visual dimensions. Runs during creation, after stories exist.
- **Design Analyst:** Extracts specs FROM Figma. Visual Reviewer compares rendered OUTPUT against Figma.
- **Accessibility Auditor:** Validates functional quality (WCAG). Visual Reviewer validates visual fidelity.
- **Quality Gate:** Mechanical toolchain checks. No visual judgment.

### Tasks

- [x] **1.1** Create `skills/visual-reviewer/SKILL.md` with frontmatter:
  ```yaml
  ---
  name: visual-reviewer
  description: Compares rendered Storybook stories against Figma designs across 9 visual dimensions (layout, typography, colors, spacing, shadows, borders, border-radius, icons, states). Applies iterative fixes for critical/moderate discrepancies. Use after story generation in the react-craft pipeline.
  user-invocable: false
  version: 1.0.0
  ---
  ```

- [x] **1.2** Create `skills/visual-reviewer/reference.md` with:
  - 9-dimension comparison checklist (layout, typography, colors, spacing, shadows, borders, border-radius, icons, states)
  - Severity classification rules: critical (layout broken, wrong colors), moderate (spacing off by >4px, wrong font weight), minor (1-2px differences, subtle shadow mismatch)
  - Screenshot capture best practices (consistent viewport, wait for fonts/images)
  - CSS property mapping per dimension (which CSS to change for each type of discrepancy)
  - Diminishing-returns rules (when to stop iterating)
  - No-regression verification checklist

- [x] **1.3** Input sources:
  - Figma link (from pipeline state) — for reference screenshot
  - Storybook story URLs — from Story Author output or Storybook MCP manifest
  - `brief.md` — for token mappings, spacing values, expected visual characteristics
  - `architecture.md` — for composition structure (which sub-components to screenshot)
  - `react-craft.config.yaml` — for output paths

- [x] **1.4** Screenshot capture process:
  - **Figma reference:** Capture via Figma Console MCP (preferred) or Playwright MCP screenshot of Figma URL
  - **Storybook rendered:** Capture via Playwright MCP at the story URL
  - **Viewport:** 640px wide for comparison (sufficient for layout/spacing/color, not retina — per deepened plan performance review)
  - **Wait conditions:** Wait for fonts loaded + images loaded + CSS transitions complete before capture

- [x] **1.5** Figma screenshot caching (performance-critical):
  - Cache Figma reference screenshot to `docs/react-craft/components/<ComponentName>/figma-reference.png` on first capture
  - All subsequent iterations reuse cached screenshot — never re-fetch from Figma
  - Only re-capture Storybook screenshot on each iteration
  - This saves 15-50s + image tokens per iteration (see deepened plan 3.6.4.1)

- [x] **1.6** 9-dimension comparison process:
  1. **Layout** — element positioning, flex/grid alignment, overall structure
  2. **Typography** — font family, size, weight, line-height, letter-spacing
  3. **Colors** — background, text, border colors, opacity
  4. **Spacing** — padding, margin, gaps between elements
  5. **Shadows** — box-shadow, drop-shadow presence and values
  6. **Borders** — border width, style, color
  7. **Border-radius** — corner rounding values
  8. **Icons** — presence, size, positioning, color
  9. **States** — hover, focus, active, disabled visual treatments

  For each dimension, classify as: PASS / MINOR / MODERATE / CRITICAL

- [x] **1.7** Severity classification:
  - **Critical:** Layout structure broken, completely wrong colors, missing elements, wrong component rendered
  - **Moderate:** Spacing off by >4px, wrong font weight/size, incorrect shadow, wrong border-radius
  - **Minor:** 1-2px spacing differences, subtle color shade differences, minor shadow tweaks

- [x] **1.8** Iterative fix loop:
  - For critical/moderate discrepancies: identify the **single most impactful fix**
  - Apply fix to the component CSS/styles
  - Re-screenshot Storybook (reuse cached Figma reference)
  - Re-compare — verify fix worked AND no regressions on previously-passing dimensions
  - **Structure fixes before polish fixes** (layout → spacing → typography → colors → details)
  - Max 5 iterations total

- [x] **1.9** Diminishing-returns threshold (codified rule, not agent judgment):
  - If iteration N-1 found only `MINOR` issues across all 9 dimensions, **stop immediately**
  - Do not consume remaining iteration budget on minor tweaks
  - Log: "Visual review converged after N iterations. Remaining differences are minor."

- [x] **1.10** No-regression check (per deepened plan 3.6.4.4):
  - After each fix, verify all previously-PASS dimensions still pass
  - If a fix introduces a regression: revert the fix, log the conflict, move to next discrepancy
  - Never apply a fix that makes something else worse

- [x] **1.11** Output: `docs/react-craft/components/<ComponentName>/visual-report.md`:
  ```markdown
  # Visual Review Report — <ComponentName>

  ## Reference Screenshots
  - Figma: figma-reference.png (cached)
  - Storybook: storybook-final.png

  ## Dimension Results

  | Dimension | Status | Details |
  |-----------|--------|---------|
  | Layout | PASS | — |
  | Typography | PASS | Fixed in iteration 2: font-weight 500→600 |
  | Colors | PASS | — |
  | Spacing | MINOR | 1px gap difference in card footer |
  | Shadows | PASS | — |
  | Borders | PASS | — |
  | Border-radius | PASS | — |
  | Icons | PASS | — |
  | States | MODERATE | [UNRESOLVED] Focus ring color slightly off |

  ## Iterations
  1. Fixed: layout — flexbox alignment (CRITICAL→PASS)
  2. Fixed: typography — font-weight (MODERATE→PASS)
  3. Stopped — only MINOR issues remaining

  ## Overall: PASS (with minor notes)
  ```

- [x] **1.12** Gate behavior:
  - Any remaining CRITICAL findings: block pipeline (unless `--best-effort`)
  - MODERATE findings: warn but don't block
  - MINOR findings: log only
  - In `--best-effort`: log all as `[UNRESOLVED_VISUAL]` and continue

- [x] **1.13** Tool requirements:
  - Requires Playwright MCP for Storybook screenshots
  - Requires either Figma Console MCP or a user-provided Figma screenshot
  - If neither available: skip Visual Reviewer entirely with warning, mark step as `skipped` in pipeline state

### Deliverable
Visual Reviewer compares rendered output against Figma across 9 dimensions, applies iterative fixes with regression checking, and respects diminishing-returns thresholds.

---

## Phase 2: Update Build Pipeline for v0.3

> **Goal:** Extend the 6-agent pipeline to 7 agents, adding Visual Reviewer after Story Author and before Quality Gate.

### Tasks

- [x] **2.1** Update `commands/react-craft/build.md` pipeline to:
  ```
  Design Analyst → Component Architect → Code Writer → [Accessibility Auditor ∥ Story Author] → Visual Reviewer → Quality Gate
  ```
  Visual Reviewer runs sequentially after the parallel a11y+story step (needs rendered stories to screenshot).

- [x] **2.2** Add Visual Reviewer step to pipeline (Step 3f, renumber Quality Gate to 3g):

  ```
  ### 3f. Visual Reviewer

  Print: `[react-craft] (6/7) Visual Reviewer: comparing <ComponentName> against Figma...`

  Invoke the `visual-reviewer` skill with:
  - Figma link (from pipeline state)
  - Storybook story URLs (from Story Author output)
  - Path to `brief.md`
  - `react-craft.config.yaml` path
  - `BEST_EFFORT` flag

  Skip condition: If Playwright MCP is not available OR Figma screenshot cannot be obtained, skip with warning:
  > [react-craft] Visual Reviewer skipped — Playwright MCP or Figma screenshot unavailable.

  Expected output: `visual-report.md` in the output directory.

  After completion:
  1. Compute SHA-256 of `visual-report.md`, store in pipeline-state.yaml
  2. Update step status
  3. Increment iterations_used
  ```

- [x] **2.3** Update pipeline-state.yaml schema:
  ```yaml
  steps:
    design-analyst: { status: completed }
    component-architect: { status: completed }
    code-writer: { status: completed }
    accessibility-auditor: { status: completed }
    story-author: { status: completed }
    visual-reviewer: { status: pending }
    quality-gate: { status: pending }
  ```

- [x] **2.4** Handle Visual Reviewer CSS fixes:
  - If Visual Reviewer modifies component files, the SHA-256 hashes for component artifacts change
  - Update artifact hashes in pipeline-state.yaml after Visual Reviewer completes
  - Quality Gate re-checks the modified files (no special handling needed — it already reads current files)

- [x] **2.5** Update progress reporting from `(N/6)` to `(N/7)` across all steps

- [x] **2.6** Update global iteration budget from 10 to 12 (Visual Reviewer can use up to 5 iterations internally, but each counts as 1 pipeline iteration since it's a single skill invocation)

- [x] **2.7** Handle the P1 a11y remediation + Visual Reviewer interaction:
  - If a11y triggers Code Writer remediation (Step 3d), Story Author re-runs (existing behavior)
  - Visual Reviewer always runs AFTER the a11y remediation cycle completes
  - No special handling needed — Visual Reviewer just waits for its inputs to be ready

- [x] **2.8** Update completion summary to include Visual Reviewer results:
  ```
  Visual Review: PASS (3 iterations, 2 fixes applied)
    Critical: 0
    Moderate: 0 (1 fixed)
    Minor: 1 remaining
  ```

- [x] **2.9** Update `--dry-run` behavior: still stops after Component Architect (Visual Reviewer is a rendering step, not a planning step)

### Deliverable
7-agent pipeline with Visual Reviewer between Story Author and Quality Gate. Graceful skip when screenshot tools unavailable.

---

## Phase 3: Custom Pipeline Skill Slots

> **Goal:** Enable users to plug custom skills (i18n checker, content strategy, etc.) into the pipeline via config.

### Tasks

- [x] **3.1** Define custom skill contract in `skills/references/custom-skill-contract.md`:
  ```markdown
  ## Custom Skill Contract

  Any SKILL.md that meets these requirements can be added to the react-craft pipeline:

  1. **Input:** Accepts file paths as scope (glob or directory)
  2. **Output format:** Findings in `[SEVERITY] file:line — category: description` format
     - Severities: `[ERROR]`, `[WARNING]`, `[INFO]`
  3. **Self-contained:** Does not depend on other react-craft skills
  4. **Config access:** May read `react-craft.config.yaml` for project context
  5. **Exit behavior:** Returns findings list. Empty list = all checks passed.
  ```

- [x] **3.2** Update `react-craft.config.yaml` schema to support custom pipeline steps:
  ```yaml
  pipeline:
    custom_skills:
      - path: ".claude/skills/i18n-checker/SKILL.md"
        config:
          default_locale: "en-US"
          frameworks: ["react-intl", "i18next"]
      - path: ".claude/skills/content-strategy/SKILL.md"
        config:
          tone_guide: "docs/content/tone-guide.md"
  ```

- [x] **3.3** Update `/react-craft:build` to run custom skills after Quality Gate (same position as enforcement skills):
  - Read `pipeline.custom_skills` from config
  - For each custom skill: validate SKILL.md exists at path, invoke with generated file paths + skill-specific config
  - Custom skills run sequentially (may modify files) unless marked `readonly: true` in config (then parallel)
  - Error handling: if a skill crashes or returns malformed output, log error, skip skill, continue with warning

- [x] **3.4** Update `/react-craft:audit` to also run custom skills when `--custom` flag is passed

- [x] **3.5** Update `/react-craft:init` to ask about custom skills:
  - "Do you have any custom validation skills to add to the pipeline? (e.g., i18n checker, content strategy)"
  - If yes, prompt for SKILL.md path and any config values
  - Write to `pipeline.custom_skills` in config

- [x] **3.6** Document custom skill authoring in README:
  - Contract requirements
  - Example: the bundled i18n-checker at `examples/custom-skills/i18n-checker/`
  - How to test a custom skill standalone before adding to pipeline

### Deliverable
Users can plug custom skills into the pipeline via config. The i18n-checker example demonstrates the pattern.

---

## Phase 4: Eval Infrastructure

> **Goal:** Measurable quality tracking with fixture-based benchmarks and reproducible reports.

### Tasks

- [x] **4.1** Create `commands/react-craft/eval.md` with frontmatter:
  ```yaml
  ---
  name: react-craft:eval
  description: Run the eval suite against component fixtures to measure pipeline quality
  argument-hint: "[--fixture=<name>] [--graders=deterministic|llm|all] [--compare=<run-id>]"
  disable-model-invocation: true
  allowed-tools: Read, Write, Edit, Bash(npx *), Bash(npm *), Glob, Grep, Skill
  ---
  ```

- [x] **4.2** Create `skills/eval-runner/SKILL.md`:
  ```yaml
  ---
  name: eval-runner
  description: Executes the react-craft eval suite — runs pipeline against fixtures, scores output with deterministic and LLM-as-judge graders, produces benchmark reports.
  user-invocable: false
  version: 1.0.0
  ---
  ```

- [x] **4.3** Create `skills/eval-runner/reference.md` with:
  - Fixture format specification (Anova YAML export structure)
  - Grader definitions and scoring rubrics
  - Report template
  - A/B comparison methodology

- [x] **4.4** Create fixture directory structure:
  ```
  react-craft/
    evals/
      fixtures/
        material-button/
          input.yaml         # Anova YAML export (snapshotted, version-controlled)
          input.sha256        # Hash for integrity verification
          EXPECTED_FINDINGS.md  # What enforcement skills should find
          metadata.yaml       # complexity, design-system, expected-agents
        material-text-field/
          input.yaml
          input.sha256
          EXPECTED_FINDINGS.md
          metadata.yaml
        adversarial-injection/
          input.yaml          # Contains shell metacharacters, path traversal, JSX injection
          input.sha256
          EXPECTED_FINDINGS.md
          metadata.yaml
      results/                # gitignored — eval run outputs
      reports/                # committed — benchmark reports
  ```

- [x] **4.5** Fixture snapshotting (per deepened plan 8.3.1-8.3.3):
  - Fixtures are static Anova YAML exports, NOT live Figma links
  - Each fixture has a SHA-256 hash file for integrity verification
  - Eval runner verifies hash before each run — halt on mismatch
  - Community-contributed fixtures must pass security review (sanitization module validation on all string values)

- [x] **4.6** Port and expand existing eval fixtures:
  - **TaxCategoryPicker** — already at `examples/eval-fixtures/` — copy to `evals/fixtures/` with proper structure
  - **Material Button** — create from Material Design 3 button spec (simple complexity)
  - **Material Text Field** — create from Material Design 3 text field spec (medium complexity)
  - **Adversarial Injection** — create with shell metacharacters in component names, `../` in paths, `<script>` in text content (security fixture)

- [x] **4.7** Fixture metadata schema:
  ```yaml
  # metadata.yaml
  name: material-button
  design_system: material-design-3
  complexity: simple  # simple | medium | complex
  expected_agents: [design-analyst, code-writer, quality-gate]  # which agents should activate
  expected_duration_seconds: 60
  tags: [button, interactive, states]
  ```

- [x] **4.8** Deterministic graders:
  | Grader | What It Checks | Score |
  |--------|---------------|-------|
  | `tsc-compiles` | TypeScript compilation with zero errors | PASS/FAIL |
  | `lint-passes` | ESLint with zero violations | PASS/FAIL |
  | `stories-render` | All Storybook stories render without errors | PASS/FAIL |
  | `axe-clean` | axe-core reports zero violations | PASS/FAIL |
  | `interaction-tests` | All play function tests pass | PASS/FAIL |
  | `no-any` | Zero `any` types in generated files | PASS/FAIL |
  | `jsdoc-coverage` | All prop interface properties have JSDoc | percentage |
  | `enforcement-match` | Enforcement findings match EXPECTED_FINDINGS.md | precision/recall |
  | `sanitization-rejects` | Adversarial inputs are rejected by sanitization module | PASS/FAIL |

- [x] **4.9** LLM-as-judge graders:
  | Grader | What It Evaluates | Score |
  |--------|------------------|-------|
  | `visual-fidelity` | Screenshot comparison scoring | 1-10 |
  | `api-quality` | Prop interface design (naming, types, composability) | 1-10 |
  | `code-readability` | Generated code clarity and convention adherence | 1-10 |
  | `ds-compliance` | Design system compliance (Guardian + Token Validator findings count) | 1-10 |

  Each LLM-as-judge grader includes:
  - A rubric definition (what constitutes each score level)
  - 2-3 calibration examples (scored reference outputs)
  - A consistency check (run grader twice, flag >2 point variance)

- [x] **4.10** Agent prompt versioning (per deepened plan 8.7.1):
  - Add `version: X.Y.Z` to every agent SKILL.md frontmatter
  - Pipeline logs which prompt versions were used in each eval run
  - Eval report includes prompt version table for reproducibility
  - Existing agents get `version: 1.0.0` (v0.1/v0.2 agents)

- [x] **4.11** Eval runner process:
  1. Parse arguments: `--fixture`, `--graders`, `--compare`
  2. If `--fixture` specified, run single fixture. Otherwise run all.
  3. For each fixture:
     a. Verify fixture hash integrity
     b. Set up isolated eval environment (temporary directory)
     c. Run pipeline with `--best-effort` (evals should not block on human gates)
     d. Run deterministic graders against output
     e. Run LLM-as-judge graders (if `--graders=llm` or `--graders=all`)
     f. Collect metrics: token usage, wall time, agent invocation count
  4. Produce eval report

- [x] **4.12** Eval report format:
  ```markdown
  # React Craft Eval Report

  **Run ID:** <UUID>
  **Date:** <ISO-8601>
  **Prompt versions:** Design Analyst v1.0.0, Component Architect v1.0.0, ...

  ## Summary

  | Fixture | Deterministic | LLM Judge | Tokens | Time |
  |---------|--------------|-----------|--------|------|
  | material-button | 8/8 PASS | 8.2 avg | 45K | 62s |
  | material-text-field | 7/8 PASS | 7.5 avg | 82K | 95s |
  | adversarial-injection | 9/9 PASS | N/A | 12K | 8s |

  ## Per-Fixture Details
  [detailed breakdown per fixture]

  ## Comparison with <previous-run-id>
  [if --compare flag used]
  ```

- [x] **4.13** A/B testing capability:
  - `--compare=<run-id>` loads a previous eval report and produces a diff
  - Delta table: which graders improved, regressed, or stayed the same
  - Token usage delta and time delta
  - Use for comparing prompt versions or skill modifications

- [x] **4.14** Eval results storage:
  - Raw results: `evals/results/<run-id>/` (gitignored — contains generated code)
  - Reports: `evals/reports/<run-id>.md` (committed — contains scores and metrics only)

### Deliverable
`/react-craft:eval` runs the fixture suite, produces scored benchmark reports with deterministic and LLM-as-judge graders, supports single-fixture runs and A/B comparison.

---

## Phase 5: Update README, Docs, and Version

> **Goal:** Update all documentation and bump version to 0.3.0.

### Tasks

- [x] **5.1** Update README:
  - Pipeline diagram: 7 agents (complete roster)
  - Visual Reviewer section: what it does, 9 dimensions, iteration loop
  - Eval section: how to run `/react-craft:eval`, fixture format, grader types
  - Custom skills section: contract, authoring guide, i18n-checker example
  - Updated roadmap: v0.3 → current, v0.4 → docs site, CI, demo video
  - Updated known limitations: eval fixtures limited to Material + Apple HIG + adversarial

- [x] **5.2** Update CHANGELOG.md with v0.3 entries

- [x] **5.3** Update team-context roster.md: mark Visual Reviewer as active, add eval-runner

- [x] **5.4** Update plugin.json version to `0.3.0`

- [x] **5.5** Add version frontmatter to all existing agent SKILL.md files:
  - design-analyst: `version: 1.0.0`
  - component-architect: `version: 1.0.0`
  - code-writer: `version: 1.0.0`
  - accessibility-auditor: `version: 1.0.0`
  - story-author: `version: 1.0.0`
  - quality-gate: `version: 1.0.0`
  - All enforcement skills: `version: 1.0.0`

- [x] **5.6** Update CONTRIBUTING.md:
  - How to add eval fixtures
  - How to write custom pipeline skills
  - How to run the eval suite locally

### Deliverable
Documentation reflects the complete 7-agent pipeline, eval infrastructure, and custom skill extensibility.

---

## Swarm Assignment

```
Phase 1 (visual reviewer) ──┐
Phase 3 (custom skills) ─────┤── can run in parallel (independent)
Phase 4 (eval infra) ────────┘
         │
         ▼
Phase 2 (update build pipeline) ── needs Phase 1
Phase 5 (update README) ───────── needs all phases
```

| Agent | Phase | Depends On |
|-------|-------|------------|
| **Agent 1: Visual Reviewer** | Phase 1 (1.1-1.13) | v0.2 complete |
| **Agent 2: Custom Skills** | Phase 3 (3.1-3.6) | v0.2 complete |
| **Agent 3: Eval Infra** | Phase 4 (4.1-4.14) | v0.2 complete |
| **Agent 4: Pipeline + Docs** | Phase 2 + Phase 5 | Agents 1-3 |

## Execution Notes

- **Same branch:** All work happens on `feat/react-craft-v01` (current branch). No new branch creation.
- **Biggest risk:** Visual Reviewer token cost (25K-60K per component). The caching + diminishing-returns threshold mitigations are critical for practical usage.
- **Eval fixtures:** Start with 3 real + 1 adversarial. Community can contribute more post-launch.
- **Custom skills are read-only by default.** Only skills marked `readonly: false` in config may modify files. This prevents custom skills from corrupting the artifact chain.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-10-react-craft-brainstorm.md](docs/brainstorms/2026-03-10-react-craft-brainstorm.md)
- **Deepened plan (phases 3.6, 8):** [docs/plans/2026-03-10-react-craft-plan-deepened.md](docs/plans/2026-03-10-react-craft-plan-deepened.md)
- **v0.1 plan:** [docs/plans/2026-03-11-001-feat-react-craft-v01-implementation-plan.md](docs/plans/2026-03-11-001-feat-react-craft-v01-implementation-plan.md)
- **v0.2 plan:** [docs/plans/2026-03-11-002-feat-react-craft-v02-implementation-plan.md](docs/plans/2026-03-11-002-feat-react-craft-v02-implementation-plan.md)
- Key decisions carried forward: 7 agents (complete), Anova YAML fixtures, custom skill contract, agent prompt versioning, diminishing-returns thresholds, Figma screenshot caching
