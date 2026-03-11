---
title: "feat: React Craft v0.1 — Plugin Scaffold, Init, Core Agents, Pipeline"
type: feat
status: active
date: 2026-03-11
origin: docs/brainstorms/2026-03-10-react-craft-brainstorm.md
deepened-plan: docs/plans/2026-03-10-react-craft-plan-deepened.md
scope: v0.1
deepened: 2026-03-11
research-agents: 15
---

# React Craft v0.1 — Implementation Plan (Deepened)

## Enhancement Summary

**Deepened on:** 2026-03-11
**Research agents used:** 15 (architecture strategist, agent-native reviewer, simplicity reviewer, pattern recognition, security sentinel, TypeScript reviewer, spec flow analyzer, performance oracle, Claude Code plugins researcher, Figma MCP researcher, React component APIs researcher, multi-agent patterns researcher, create-agent-skills skill, agent-native-architecture skill, frontend-design skill)

### Key Improvements

1. **Simplified to 4 phases** (from 6) per simplicity review — merge scaffold+team docs, merge build+README
2. **Agents as skill directories** with `SKILL.md` + reference files, not bare `.md` files (create-agent-skills research)
3. **Commands use `disable-model-invocation: true`** and `allowed-tools` (official Claude Code plugin spec)
4. **Pipeline-level `--best-effort` flag** that gives every agent autonomous defaults for all human gates (agent-native review)
5. **Security invariants restored**: sanitization module, path canonicalization, Figma data delimiters, script confirmation gate
6. **Pipeline state file + `--resume`** capability for mid-pipeline failures (spec flow analysis)
7. **TypeScript rigor**: minimum TS 5.0, React 19 ref-as-prop conditional, tsconfig parsing, readonly props
8. **Performance optimizations**: enforce node-level Figma URLs, cache Figma data, condense roster, scope init detection
9. **Plugin structure corrected**: component dirs at plugin root (not inside `.claude-plugin/`), `plugin.json` is minimal
10. **Git branch creation at pipeline start** for safe rollback

### Scope Assessment (from Simplicity Review)

The simplicity reviewer recommends cutting to 4 phases. Specific cuts:
- **Phase 2 (team docs) merged into Phase 1** — fold shared values into CLAUDE.md, keep only brief template
- **Complexity routing removed** — always run full 4-agent pipeline (skip adds branching logic for negligible savings)
- **Hooks deferred to v0.2** — no hooks.json in v0.1
- **`--best-effort` kept** but elevated to pipeline-level (agent-native review says this is highest-impact change)
- **Handoff notes simplified** — agent output IS the handoff; no separate protocol needed for 4-agent linear chain
- **Detection logic narrowed** — 5 package.json checks + interactive questions (not filesystem scanning)

### Out of Scope for v0.1

- Accessibility Auditor, Story Author, Visual Reviewer agents (v0.2)
- Enforcement skills from prior toolkit (v0.2)
- Hooks infrastructure (v0.2)
- Eval infrastructure (v0.3)
- Batch mode / concurrent builds
- Custom pipeline skill slots
- Figma-to-code drift detection
- Documentation site

---

## Phase 1: Plugin Scaffold & Shared Documents

> **Goal:** A valid, installable Claude Code plugin with team foundation documents.

### Tasks

- [ ] **1.1** Initialize git repo (`git init`)
- [ ] **1.2** Create directory structure (component dirs at plugin root, not inside `.claude-plugin/`):
  ```
  react-craft/
    .claude-plugin/
      plugin.json           # Manifest only — nothing else in this dir
    commands/
      react-craft/          # Namespaced: creates /react-craft:init, /react-craft:build
        init.md
        build.md
    skills/
      design-analyst/
        SKILL.md            # user-invocable: false
        reference.md
      component-architect/
        SKILL.md
        reference.md
      code-writer/
        SKILL.md
        reference.md
      quality-gate/
        SKILL.md
        reference.md
      team-context/
        SKILL.md            # user-invocable: false — shared values + roster
        charter.md
        roster.md
      templates/
        SKILL.md            # user-invocable: false
        component-brief.md
        architecture.md
    CLAUDE.md               # Plugin-level behavioral instructions
    README.md
    CHANGELOG.md
    LICENSE
  ```

### Research Insights: Plugin Structure (Claude Code plugins research)

- **`plugin.json` is minimal** — only `name` is required. Claude Code auto-discovers commands/, skills/, agents/ at the plugin root.
- **Agents as skill directories**: Each agent should be a skill directory with `SKILL.md` + `reference.md`, not a bare `.md` file. This enables progressive disclosure and keeps SKILL.md under 500 lines.
- **`user-invocable: false`** for agents that are orchestrated by `/build`, not invoked directly by users.
- **Namespace commands** via directory: `commands/react-craft/init.md` creates `/react-craft:init`.
- **Use `${CLAUDE_PLUGIN_ROOT}`** in hooks/scripts for absolute path resolution.

- [ ] **1.3** Write `plugin.json`:
  ```json
  {
    "name": "react-craft",
    "version": "0.1.0",
    "description": "Multi-agent Figma-to-component pipeline for React",
    "author": { "name": "Kaelig" },
    "license": "MIT",
    "keywords": ["react", "figma", "components", "storybook", "a11y", "design-system"]
  }
  ```
- [ ] **1.4** Write MIT LICENSE file
- [ ] **1.5** Write CHANGELOG.md (Unreleased section)
- [ ] **1.6** Write plugin-level CLAUDE.md with shared values (condensed from charter):
  - Semantic HTML first, platform features before JS
  - Mobile-first, accessibility is not optional (WCAG AA floor)
  - Tokens over hardcoded values, simplicity over sophistication
  - Don't guess — ask. Missing info is a stop signal.
- [ ] **1.7** Write `skills/team-context/SKILL.md` with charter and roster as linked references
  - **Condense roster** to one-line teammate summaries (~200 tokens, not 600) per performance review
  - Full descriptions only in each agent's own SKILL.md

### Research Insights: Roster Condensation (Performance Oracle)

Each agent loads charter + roster. At ~400+600 tokens × 4 agents = 4,000 tokens of preamble overhead. Condensing roster to one-liners saves ~1,600 tokens per pipeline run.

- [ ] **1.8** Write `skills/templates/SKILL.md` with component-brief template and architecture template as references
- [ ] **1.9** Write initial README with vision, install instructions, compatibility matrix

### Deliverable
Plugin installs in Claude Code with skills, templates, and team documents — zero commands yet.

---

## Phase 2: `/react-craft:init` Command + Security Foundation

> **Goal:** Detect codebase setup, write `react-craft.config.yaml`, establish security invariants.

### Security Foundation (must precede agent work)

- [ ] **2.0.1** Define sanitization module for Figma-sourced strings (restored from deepened plan CC.2):
  - Component names: `^[A-Z][a-zA-Z0-9]*$` (reject Windows reserved names: CON, PRN, AUX, NUL)
  - Variant names: `^[a-zA-Z0-9_-]+$`
  - CSS class names from Figma layers: `^[a-zA-Z_][a-zA-Z0-9_-]*$`
  - Text content: use React `{content}` interpolation only, never raw string interpolation
  - Max length limits: 100 chars for names, 1000 for text content
  - All Figma data wrapped in `[FIGMA_DATA]...[/FIGMA_DATA]` delimiters in briefs (anti-prompt-injection)
- [ ] **2.0.2** Define path canonicalization rule (restored from deepened plan CC.4):
  - All output paths must resolve within `$PROJECT_ROOT`
  - Reject `../`, null bytes, symlinks pointing outside root
  - ComponentName validated against sanitization module before use in paths

### Init Command Tasks

- [ ] **2.1** Create `commands/react-craft/init.md` with frontmatter:
  ```yaml
  ---
  name: react-craft:init
  description: Initialize a react-craft project — detects codebase conventions and writes config
  argument-hint: "[--defaults] [--scope=src/components]"
  disable-model-invocation: true
  allowed-tools: Read, Bash(node *), Bash(npm *), Bash(npx *), Write, Edit, Glob, Grep
  ---
  ```

### Research Insights: Narrowed Detection (Simplicity + Performance Reviews)

Detection scoped to 5 package.json checks + interactive questions. No filesystem scanning for patterns (fragile heuristics, slow on monorepos).

- [ ] **2.2** Detection logic (package.json primary, fast):
  - React version (`dependencies.react`)
  - Styling deps: Tailwind (`tailwindcss`), styled-components, CSS Modules (check for `*.module.css` config)
  - DS library: MUI, Radix, Chakra, Headless UI, React Aria
  - Storybook version + addons (`devDependencies`)
  - Available scripts: lint, format, typecheck, test, storybook from `scripts`

### Research Insights: Multi-Styling Resolution (Spec Flow Analysis)

- [ ] **2.2.1** When multiple styling methods detected, prompt: "I found both Tailwind and styled-components. Which should react-craft use for new components?" Report file counts per method for context.

### Research Insights: tsconfig Parsing (TypeScript Review)

- [ ] **2.2.2** Parse `tsconfig.json` for Code Writer:
  - `jsx` transform: `react-jsx` (no import needed) vs `react` (import React required)
  - `moduleResolution`: affects whether barrel exports need `.js` extensions
  - `paths` / `baseUrl`: for import alias generation
  - `verbatimModuleSyntax`: requires `import type` for type-only imports
  - TypeScript version: minimum 5.0 (required for `satisfies` operator)

### Research Insights: React Version Detection (TypeScript Review)

- [ ] **2.2.3** Detect React version for ref pattern:
  - React 18: use `forwardRef` with named function expression
  - React 19+: use `ref` as a regular prop, no `forwardRef` wrapper

- [ ] **2.3** Prerequisite validation (keep only non-obvious checks per simplicity review):
  - Figma MCP availability check (the only non-obvious prerequisite)
  - TypeScript version ≥ 5.0 (warn if below)
- [ ] **2.4** Write `react-craft.config.yaml`:
  - `design_system`: name, component_prefix, support_channel (validated: HTTPS + known domains), support_label
  - `detection`: styling_method, react_version, typescript_version, jsx_transform, module_resolution, path_aliases
  - `scripts`: lint, format, typecheck (confirmed by user — not auto-trusted)
  - `agents`: per-agent enabled/disabled
  - `output`: components_dir (e.g., `src/components/`), docs_dir (`docs/react-craft/`)
  - `scope`, `severity`

### Research Insights: Script Confirmation Gate (Security Sentinel — NEW-2)

- [ ] **2.4.1** Display detected script commands and require user confirmation before adding to config. Malicious `package.json` scripts could exfiltrate data when Quality Gate runs them.

### Research Insights: Dependency Policy (Spec Flow Analysis)

- [ ] **2.4.2** Ask about dependency policy: "Are there any UI libraries you want to avoid?" Store as `banned_dependencies` in config.

- [ ] **2.5** Add CLAUDE.md instructions with `<!-- react-craft:start -->` / `<!-- react-craft:end -->` markers
  - Write only static hardcoded strings — no Figma data or user input
  - Display additions for user approval before writing

### Deliverable
`/react-craft:init` produces validated config with security foundation, scoped detection, and user-confirmed scripts.

---

## Phase 3: Core Agents + Build Pipeline

> **Goal:** Build 4 agents as skill directories, wire into pipeline with safety rails.

### Agent Contracts (prerequisites)

- [ ] **3.0.1** Each agent SKILL.md uses frontmatter: `name`, `description` (what + when), `user-invocable: false`
- [ ] **3.0.2** Each agent writes standard output artifact. No separate handoff notes protocol — the artifact IS the handoff for a 4-agent linear chain. (Simplicity review: formalize handoff protocol in v0.2 when adding agents 5-7.)
- [ ] **3.0.3** Each agent SKILL.md includes concrete input/output examples (create-agent-skills requirement)
- [ ] **3.0.4** Agents have access to file primitives (Read, Glob, Grep) so they can pull additional context when needed (agent-native architecture recommendation)

### 3.1 Design Analyst Agent

- [ ] **3.1.1** Create `skills/design-analyst/SKILL.md` + `reference.md`
  ```yaml
  ---
  name: design-analyst
  description: Extracts structured component specs from Figma designs. Use when processing Figma exports or preparing component briefs.
  user-invocable: false
  ---
  ```
- [ ] **3.1.2** Input: Figma link (node-level preferred) or Anova YAML
- [ ] **3.1.3** Figma URL validation:
  - Accept `figma.com/file/...` and `figma.com/design/...` URLs
  - Reject prototype links, branch URLs, URL shorteners
  - **Require node-level links** for files with >50 top-level frames (performance: prevents 5-50MB fetches)
  - Lightweight MCP ping before full extraction (fail fast on access issues)

### Research Insights: Figma Data Caching (Performance Oracle — P1)

- [ ] **3.1.4** Cache all Figma data to `docs/react-craft/components/<ComponentName>/figma-raw.json` on first fetch. All downstream agents and remediation loops reuse cached data — never re-fetch.

- [ ] **3.1.5** Process: Extract via Figma Console MCP (fallback: Official Figma MCP), parse Anova YAML if provided
- [ ] **3.1.6** **Sanitize all extracted strings** through sanitization module (2.0.1) before writing to brief
- [ ] **3.1.7** Wrap all Figma-sourced content in `[FIGMA_DATA]...[/FIGMA_DATA]` delimiters in the brief (anti-prompt-injection, Security NEW-1)
- [ ] **3.1.8** Completeness checklist: states, responsive, motion, content rules, keyboard, tokens
- [ ] **3.1.9** NEVER guess — ask human for missing info with specific questions requesting node-level Figma links
- [ ] **3.1.10** Output: component brief (markdown) to `docs/react-craft/components/<ComponentName>/brief.md`
- [ ] **3.1.11** Gate: block on `[PENDING]` items unless `--best-effort` is set

### Research Insights: `--best-effort` as Pipeline-Level Flag (Agent-Native Review — Critical)

All human gates have autonomous defaults when `--best-effort` is active:
- Design Analyst: document assumptions as `[ASSUMED]` tags, proceed
- Component Architect: auto-approve API, log to architecture.md
- Code Writer: overwrite existing files, log overwrites
- Quality Gate: attempt Fix, then Defer remaining as TODOs, never Accept silently

### 3.2 Component Architect Agent

- [ ] **3.2.1** Create `skills/component-architect/SKILL.md` + `reference.md`
- [ ] **3.2.2** Read brief.md from Design Analyst
- [ ] **3.2.3** Break complex components into atomic parts
- [ ] **3.2.4** Define TypeScript prop interface:
  - **Discriminated unions** for mutually exclusive variants (including variant-specific associated data)
  - **Compound components** for compositional patterns
  - **Boolean flags** ONLY for independent binary states
  - **Readonly props**: all prop interfaces use `Readonly<>` or `readonly` arrays
  - **Max 1 generic param** per component; constrain with `extends`

### Research Insights: React 19 Ref Pattern (TypeScript Review)

- [ ] **3.2.5** When React 19+ detected in config, design API with `ref` as a regular prop (no `forwardRef`). When React 18, use `forwardRef` with named function expression.

- [ ] **3.2.6** Research existing libraries for complex components (Radix, React Aria, Headless UI) via web search
- [ ] **3.2.7** Prefer existing DS components; check `banned_dependencies` from config before recommending new ones
- [ ] **3.2.8** Output: separate `architecture.md` to component docs directory

### Research Insights: Dependency Approval (Spec Flow Analysis)

- [ ] **3.2.9** When recommending a new library, present as a user gate: "I recommend @radix-ui/react-dialog. Proceed with Radix, or custom implementation?" In `--best-effort` mode, log recommendation and proceed with custom.

### 3.3 Code Writer Agent

- [ ] **3.3.1** Create `skills/code-writer/SKILL.md` + `reference.md`
- [ ] **3.3.2** Read brief.md + architecture.md (if architecture.md absent due to simple routing, infer structure from brief)
- [ ] **3.3.3** Read config FIRST for styling, naming, token conventions, jsx_transform, path_aliases
- [ ] **3.3.4** Implementation rules:
  - Semantic HTML elements first (`<button>`, `<nav>`, `<dialog>`, `<details>`)
  - Platform features for forms, hovers, buttons, URLs
  - JS client-side features only when CSS/HTML can't do it
  - Mobile-first responsive with native features
  - `prefers-reduced-motion` for any animation
  - CSS custom properties for all design token values
  - `import type` for type-only imports (required when `verbatimModuleSyntax` enabled)

### Research Insights: TypeScript Rules (TypeScript Review)

- [ ] **3.3.5** TypeScript codegen rules:
  - Zero `any` — use `unknown` + type guards
  - Zero `as` assertions in component logic (permitted only at render boundary of polymorphic components and DOM ref narrowing, with `// type-assertion: <reason>` comment)
  - `export type` for all type-only exports
  - Discriminated unions with variant-specific data when different variants carry different props
  - Conditional ref pattern based on detected React version

### Research Insights: Aesthetic Intentionality (Frontend Design Skill)

- [ ] **3.3.6** Faithfully translate Figma's visual character — typography, color, spacing, motion — into code. Use CSS custom properties. Don't normalize spacing/layout into generic patterns. Preserve the design's compositional choices.

- [ ] **3.3.7** Output: React component file(s) + index barrel export to project source tree

### 3.4 Quality Gate Agent

- [ ] **3.4.1** Create `skills/quality-gate/SKILL.md` + `reference.md`
- [ ] **3.4.2** Checks (using confirmed scripts from config):
  - TypeScript compilation (`tsc --noEmit --incremental` for speed)
  - Linting (detected linter from config)
  - Formatting (detected formatter)

### Research Insights: Scoped Type Checking (Performance Oracle)

- [ ] **3.4.3** Use temporary `tsconfig.react-craft.json` extending user's config with `include` scoped to generated files only. Reduces type-check from 30s to 3-5s on large projects.

### Research Insights: Baseline Comparison (Spec Flow Analysis)

- [ ] **3.4.4** Before pipeline starts, capture baseline `tsc` error count. Quality Gate only flags NEW errors introduced by react-craft.

- [ ] **3.4.5** Three-path failure handling:
  - **Fix**: auto-fixable issues (lint --fix, format)
  - **Defer**: add `// @ts-expect-error [react-craft] TODO: <explanation>` — never Accept silently for type errors
  - **Accept**: only for non-blocking warnings, logged in review.md
  - In `--best-effort` mode: attempt Fix, then Defer all remaining

### Research Insights: Bail on Identical Failures (Security NEW-6 + Performance)

- [ ] **3.4.6** If attempt N fails with same error signature as attempt N-1, halt immediately (don't burn tokens on repeated failures)

- [ ] **3.4.7** Output: quality report with PASS/FAIL per check in `review.md`

### 3.5 `/react-craft:build` Pipeline

- [ ] **3.5.1** Create `commands/react-craft/build.md` with frontmatter:
  ```yaml
  ---
  name: react-craft:build
  description: Build a React component from a Figma design spec using the react-craft agent pipeline
  argument-hint: "<figma-link> [--best-effort] [--resume <ComponentName>]"
  disable-model-invocation: true
  allowed-tools: Read, Write, Edit, Bash(npx *), Bash(npm *), Glob, Grep, Skill
  ---
  ```

### Research Insights: Git Branch at Pipeline Start (Spec Flow Analysis)

- [ ] **3.5.2** Before any file generation, create a git branch: `git checkout -b react-craft/<ComponentName>`. Trivial rollback mechanism.

### Research Insights: Pre-Flight Checks (Spec Flow Analysis + Architecture Review)

- [ ] **3.5.3** Pre-flight validation before pipeline starts:
  - Config exists and is valid
  - Figma link accessible (lightweight MCP ping)
  - No concurrent pipeline in progress (check for existing `pipeline-state.yaml` with status `in-progress`)
  - Capture baseline tsc error count

- [ ] **3.5.4** Pipeline: Design Analyst → Component Architect → Code Writer → Quality Gate
  - Always run full pipeline (no complexity routing in v0.1 — simplicity review)
  - Each agent reads upstream artifacts from `docs/react-craft/components/<ComponentName>/`

### Research Insights: Pipeline State + Resume (Spec Flow Analysis — Critical Gap)

- [ ] **3.5.5** Write `pipeline-state.yaml` tracking agent completion:
  ```yaml
  component: DataTable
  started: 2026-03-11T10:00:00Z
  figma_link: "https://figma.com/..."
  status: in-progress  # in-progress | completed | failed | partial
  steps:
    design-analyst: { status: completed, timestamp: "..." }
    component-architect: { status: completed, timestamp: "..." }
    code-writer: { status: failed, error: "...", attempts: 2 }
  ```
- [ ] **3.5.6** `--resume <ComponentName>`: read pipeline-state.yaml, resume from last failed step

### Research Insights: Artifact Integrity (Security NEW-3)

- [ ] **3.5.7** Compute SHA-256 hash of each artifact after write, store in pipeline-state.yaml. Before downstream agent reads, verify hash. Halt on tamper detection.

- [ ] **3.5.8** Remediation loop: if Quality Gate fails, re-invoke Code Writer with **failure diffs only** (not full report — saves 40-60% remediation tokens), max 3 attempts

### Research Insights: Remediation Terminal State (Architecture Review)

- [ ] **3.5.9** When remediation exhausted (3 attempts or identical failure):
  1. Leave generated files in place (do NOT delete)
  2. Mark pipeline-state.yaml as `status: partial`
  3. Add `[UNRESOLVED]` markers to review.md with all remaining findings
  4. Present summary: "Quality Gate failed after 3 attempts. Files at [paths]. Fix manually and run `/react-craft:build --resume <Name>` to re-validate."
  5. Do NOT suggest committing broken code

- [ ] **3.5.10** Global iteration budget: max 6 re-invocations per pipeline run (reduced from 10 — performance review)

### Research Insights: Output Directory from Config (Architecture Review)

- [ ] **3.5.11** Read `output.components_dir` and `output.docs_dir` from config for file placement. Don't hardcode paths.

### Deliverable
`/react-craft:build <figma-link>` produces a React component through the 4-agent pipeline with safety rails, resume capability, and clear terminal states.

---

## Phase 4: README & Documentation

> **Goal:** Professional README for open-source launch.

### Tasks

- [ ] **4.1** Write comprehensive README:
  - Vision and philosophy
  - Quick start: install → `/react-craft:init` → `/react-craft:build <figma-link>`
  - Architecture overview (agent team, pipeline, quality gates)
  - Compatibility matrix (standalone / +CE / +BMAD)
  - v0.1 scope and roadmap to v0.2 (remaining 3 agents, hooks, enforcement skills)
  - Known limitations: no stories, no a11y audit, no visual comparison in v0.1
  - `--best-effort` mode documentation with autonomous decision table
  - Security model: trust boundaries, what the plugin can access

### Research Insights: Security Documentation (Security Sentinel)

- [ ] **4.2** Document in README: "react-craft executes user-defined scripts from package.json (lint, format, typecheck). These run with your shell's permissions. Review scripts during `/react-craft:init` when prompted."

- [ ] **4.3** Write CONTRIBUTING.md basics

### Deliverable
Professional README with honest scope documentation, security model, and roadmap.

---

## Execution Strategy

### Phase Dependencies

```
Phase 1 (scaffold + team docs)
  ├── Phase 2 (init + security) ──────┐
  └── Phase 3 agents (parallel):      │
        ├── 3.1 Design Analyst         │
        ├── 3.2 Component Architect    │
        ├── 3.3 Code Writer            │
        └── 3.4 Quality Gate           │
              └── 3.5 Build pipeline ──┘ (needs init + all agents)
                    └── Phase 4 (README)
```

### Swarm Agent Assignments

| Swarm Agent | Tasks | Dependencies |
|-------------|-------|--------------|
| **Agent 1: Scaffold** | Phase 1 (1.1-1.9) | None |
| **Agent 2: Init + Security** | Phase 2 (2.0.1-2.5) | Agent 1 |
| **Agent 3: Design Analyst** | Phase 3.1 (3.1.1-3.1.11) | Agent 1 |
| **Agent 4: Component Architect** | Phase 3.2 (3.2.1-3.2.9) | Agent 1 |
| **Agent 5: Code Writer** | Phase 3.3 (3.3.1-3.3.7) | Agent 1 |
| **Agent 6: Quality Gate** | Phase 3.4 (3.4.1-3.4.7) | Agent 1 |
| **Agent 7: Build Pipeline + README** | Phase 3.5 + Phase 4 | Agents 2-6 |

---

## Cross-Cutting Decisions

### Config Naming (Pattern Recognition — resolved)
All references use `react-craft.config.yaml`. The brainstorm's `frontend-craft.config.md` and original plan's `react-craft.config.md` are superseded.

### Agent-as-Orchestrator vs Coded Sequence (Agent-Native Architecture)
The agent-native review recommends making `/build` an agent that decides routing via judgment, not coded sequence. **Decision for v0.1:** use a coded sequence (deterministic, debuggable, predictable for first users). The simplicity of a 4-agent linear pipeline doesn't warrant agent-level routing. Revisit for v0.2 when adding 3 more agents with parallel execution and conditional routing.

### YAML Sidecar Files (Pattern Recognition)
The deepened plan proposes dual `.md` + `.yaml` output for every artifact. **Decision for v0.1:** markdown only. The `pipeline-state.yaml` is the sole structured file. YAML sidecars add dual-source-of-truth risk and tool call overhead. Revisit for v0.2 when agent-native consumers exist.

### Concurrent Builds (Spec Flow Analysis)
Not supported in v0.1. Pipeline checks for existing `pipeline-state.yaml` with `status: in-progress` and warns. Scoped tsc to generated files avoids cross-contamination.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-10-react-craft-brainstorm.md](docs/brainstorms/2026-03-10-react-craft-brainstorm.md)
- **Deepened plan:** [docs/plans/2026-03-10-react-craft-plan-deepened.md](docs/plans/2026-03-10-react-craft-plan-deepened.md)
- **Research agents:** architecture-strategist, agent-native-reviewer, code-simplicity-reviewer, pattern-recognition-specialist, security-sentinel, kieran-typescript-reviewer, spec-flow-analyzer, performance-oracle, best-practices-researcher ×4, create-agent-skills skill, agent-native-architecture skill, frontend-design skill
- Key decisions carried forward: standalone plugin, 7 agents (4 for v0.1), YAML config, team charter/roster pattern, `--best-effort` pipeline-level flag, git branch safety, pipeline state + resume
