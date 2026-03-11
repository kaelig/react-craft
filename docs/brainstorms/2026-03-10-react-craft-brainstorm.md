---
date: 2026-03-10
topic: react-craft-plugin
status: complete
---

# React Craft: Figma-to-Component Claude Code Plugin

## What We're Building

A standalone, open-source Claude Code plugin that orchestrates a multi-agent workflow for turning Figma designs into production-grade, tested, accessible React components with Storybook stories. It codifies 20 years of frontend expertise into opinionated quality gates that elevate the floor for every team.

**Name:** `react-craft`

**Audience:**
1. Design system developers and designers building/maintaining component libraries
2. Product developers consuming a design system who need custom components and flows from Figma, broken down into atomic reusable parts

**Open source goal:** Marketable as a standalone product that elevates frontend development quality across the industry.

## Why This Approach

### Standalone Plugin (Not a CE/BMAD Extension)
- Independent versioning, branding, and release cycle
- Own marketplace repo, README, docs site
- Installable alongside CE and/or BMAD without dependency
- Works standalone; enhanced with CE or BMAD b6+

### Compatibility Matrix
| Setup | Experience |
|-------|-----------|
| **react-craft alone** | Full core pipeline: Figma analysis, code generation, a11y audit, Storybook tests, visual comparison, quality gates |
| **react-craft + CE** | Gains `agent-browser`, `kieran-typescript-reviewer`, `performance-oracle`, `pattern-recognition-specialist`, deeper review workflows |
| **react-craft + BMAD b6+** | Can consume BMAD's UX Designer output (design system artifacts, component specs from PRD->UX flow) as input to the Design Analyst, creating a PRD->Design->Code pipeline |
| **react-craft + CE + BMAD** | Full stack: business requirements -> design -> component -> tested -> reviewed -> documented |

## Tooling Stack

### Required
- **Anova Figma plugin** — Extracts structured component specs (YAML/JSON) from Figma with variant-diff analysis
- **Figma Console MCP** (TJ Pitre) — 57+ tools for deep design system access, variable extraction, token export. Fallback: Official Figma MCP (targeted code gen from component links)
- **Storybook MCP** (`@storybook/addon-mcp`) — Story URL retrieval, component manifest, documentation. Requires Storybook 10+
- **Playwright MCP** — Browser automation for screenshots, interaction testing, visual comparison
- **Storybook a11y addon** (`@storybook/addon-a11y`) — axe-core WCAG validation across all stories

### Optional (Enhanced Experience)
- **agent-browser** (Vercel) — 93% more token-efficient browser snapshots for long sessions. CLI-based, no MCP config needed
- **Context7 MCP** — Framework documentation lookup
- **CE agents** — TypeScript reviewer, performance oracle, pattern recognition
- **BMAD workflows** — UX design specs, story files, project context

## Assumptions

- React 18, optimized for client-side rendering
- Storybook 10 with interaction tests + a11y addon
- No assumed styling method — `/init` detects Tailwind, CSS Modules, styled-components, etc.
- Mobile-first responsive approach with native features unless too complex
- Semantic HTML first, platform features for forms/hovers/buttons/URLs, JS client-side features only when needed
- Motion/animation are functional, not decorative. Always respect `prefers-reduced-motion`

## Multi-Agent Architecture

| Agent | Persona | Role | Primary Tools |
|-------|---------|------|---------------|
| **Design Analyst** | Design system maintainer | Extracts structured specs from Figma, produces component brief | Figma Console MCP, Anova YAML, Official Figma MCP |
| **Component Architect** | Library author | Breaks complex designs into atomic parts, defines component API, researches existing libraries | context7, Grep, web search |
| **Code Writer** | Senior React developer | Generates React components following detected conventions | Read, Write, Edit |
| **Accessibility Auditor** | User with disabilities | Validates WCAG, semantic HTML, ARIA, keyboard nav, reduce-motion | axe-core via Storybook a11y, Playwright MCP |
| **Story Author** | QA engineer | Creates Storybook stories with interaction tests for every edge case | Storybook MCP, Bash |
| **Visual Reviewer** | Pixel-perfect designer | Screenshots component vs Figma, compares, flags differences | Playwright MCP or agent-browser |
| **Quality Gate** | CI/CD pipeline | Runs linting, type checking, formatting | Bash |

## Workflow

```
/react-craft:init             -> Detect codebase setup, write frontend-craft.config.md
/react-craft:build <figma>    -> Full pipeline:
  1. Design Analysis            (Design Analyst)
  2. Component Breakdown        (Component Architect)
  3. Implementation             (Code Writer)
  4. Accessibility Audit        (Accessibility Auditor) [parallel with 5]
  5. Story & Test Authoring     (Story Author)          [parallel with 4]
  6. Visual Comparison          (Visual Reviewer)
  7. Quality Gate               (lint/types/format)
  8. -> Loop back to 3 if gates fail (max 3 attempts)
/react-craft:audit            -> Run against existing components
/react-craft:eval             -> Run eval suite against fixtures
```

### Complexity-Adaptive Pipeline
| Complexity | Example | Pipeline |
|------------|---------|----------|
| **Simple** | button, badge, icon | Skip library research, skip visual comparison, streamlined |
| **Medium** | card, form field, dropdown | Full pipeline, single-pass review |
| **Complex** | data table, multi-step form, rich text editor | Full pipeline + library research + multi-pass review + user gates |

## Patterns Absorbed from CE and BMAD

### From BMAD (Workflow Discipline)
1. **Artifact chain with bidirectional handoff** — Each phase produces a markdown file consumed by the next
2. **Self-contained component briefs** — Embed ALL context (tokens, conventions, existing components) so agents never search externally
3. **Step-file sharding** — Each agent loads only its own prompt, preventing context overflow
4. **Fresh-context validation** — Quality gate agents run in fresh context, can't be influenced by implementation reasoning
5. **project-context.md pattern** — `frontend-craft.config.md` as constitutional document loaded by every agent

### From CE (Multi-Agent Excellence)
6. **Parallel fan-out with synthesis** — Spawn review agents in parallel, deduplicate findings, prioritize by severity
7. **Persona-based specialization** — Each agent has domain expertise creating consistent, opinionated standards
8. **Iterative screenshot loop** — ONE change per iteration, screenshot, evaluate, max 5 iterations
9. **Configurable agent roster** — Teams can enable/disable agents in config

### From Both (Operational Maturity)
10. **Adaptive process** — Assess complexity before choosing workflow depth
11. **Three-path failure handling** — Fix (auto-remediate) / Defer (TODO) / Accept (logged deviation)
12. **Eval infrastructure** — First-class eval system with fixtures, graders, and benchmarks

## Eval Strategy

### Fixture Designs
- Actual Figma files from popular design systems: Google Material, Apple HIG, and other popular systems
- Variety of component complexity levels
- Community-contributable fixture library

### Three-Layer Eval
1. **Skill triggering evals** — Verify commands trigger correctly
2. **Output quality evals** — Deterministic (TypeScript compiles, axe-core passes, tests pass, lint passes) + LLM-as-judge (visual fidelity, API quality, code readability)
3. **Benchmarks** — Track token usage, time, pass rate per agent, per fixture across model updates

### Eval Modes (from Anthropic skill-creator)
- **Create** — Generate test cases
- **Eval** — Run assertions against output
- **Improve** — A/B test skill versions (blind comparison)
- **Benchmark** — Track metrics over time

## Key Principles

- **Never guess, always ask** — If context is missing from Figma (states, responsive behavior, interaction patterns, content rules), the agent stops and asks the human. It requests specific Figma frame/node links rather than pulling entire files. Guessing fills codebases with wrong assumptions that are expensive to undo.
- **Semantic HTML first** — Use the platform for forms, hovers, buttons, URLs
- **Mobile-first responsive** — Native features unless too complex
- **Motion is functional** — No decorative animation. Always `prefers-reduced-motion`
- **TDD with Storybook** — Interaction tests + a11y addon, not Jest/RTL
- **Research before reinventing** — Complex components trigger library research
- **Platform over JS** — CSS for what CSS can do, JS only when absolutely needed

## Prior Art: Frontend Agent Toolkit (2026-03-05)

The prior research at `../2026-03-05-bmad-vs-ce/` built the **enforcement/review layer** — skills that validate existing code against a design system. React Craft focuses on the **creation layer** — turning Figma designs into code. The two are complementary:

| Layer | Responsibility | Toolkit |
|-------|---------------|---------|
| **Creation** (react-craft) | Figma → Component → Stories → Tests | This plugin |
| **Enforcement** (frontend-agent-toolkit) | Component → DS Compliance → Token Validation → Deviation Report | Prior work |

### What We Absorb from Prior Work

1. **4-layer architecture** (Data → Skills → Workflow → Distribution) — proven pattern we adopt
2. **Design System Guardian** skill pattern — SKILL.md with YAML frontmatter, progressive disclosure via `references/`, structured finding format
3. **`@ds-deviation` inline comments** — lightweight justification mechanism for intentional deviations
4. **Confidence-based classification** — auto-classify findings by confidence threshold (>90% accidental, 60-90% needs review, <60% needs review)
5. **Configurable pipeline with custom skill slots** — the `.frontend-toolkit.yaml` `pipeline` section with `skill: custom` entries
6. **The i18n-checker example** — proves extensibility: drop a SKILL.md, add to pipeline, gain capability
7. **EXPECTED_FINDINGS.md pattern** — concrete test cases showing what each skill should detect per fixture
8. **Hooks integration** — dual strategy: shell-based PostToolUse for fast deterministic checks + CLAUDE.md instructions for semantic AI checks

### Design System Guardian, Token Validator, Implementation Checker, Deviation Tracker

These four skills from the prior work should be **bundled into react-craft as built-in review skills** that run as part of the `/build` pipeline's quality gates. They are the enforcement layer that validates code the creation agents produce.

## Extensibility: Custom Pipeline Steps (i18n, Content Strategy, etc.)

Users plug in their own skills via the pipeline config in `react-craft.config.yaml`:

```yaml
pipeline:
  # Built-in creation agents (run by /build)
  - agent: design-analyst
  - agent: component-architect
  - agent: code-writer
  - agent: accessibility-auditor
  - agent: story-author
  - agent: visual-reviewer
  - agent: quality-gate

  # Built-in enforcement skills (from prior toolkit)
  - skill: guardian
  - skill: token-validator
  - skill: implementation-checker

  # Custom skills — drop a file, gain a capability
  - skill: custom
    path: ".claude/skills/i18n-checker/SKILL.md"
    config:
      default_locale: "en-US"
      frameworks: ["react-intl", "i18next"]
  - skill: custom
    path: ".claude/skills/content-strategy/SKILL.md"
    config:
      tone_guide: "docs/content/tone-guide.md"
      terminology_file: "docs/content/terminology.yaml"

  # Deviation tracker always runs last
  - skill: deviation-tracker
```

**Custom skill contract:** Any SKILL.md that (1) accepts file scope as input, (2) outputs findings in `[SEVERITY] file:line — category` format, and (3) is self-contained can be plugged into the pipeline. No code changes to react-craft required.

## Hooks Integration

React Craft ships with a `hooks/hooks.json` that auto-triggers checks on Claude Code lifecycle events:

### Shell-Based Hooks (Fast, Deterministic)
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "FILE=\"$TOOL_INPUT_FILE_PATH\"; if echo \"$FILE\" | grep -qE '\\.(tsx|jsx|css|scss)$'; then HITS=$(grep -n '#[0-9a-fA-F]\\{3,8\\}' \"$FILE\" 2>/dev/null | head -3); if [ -n \"$HITS\" ]; then echo '[react-craft] Potential hardcoded colors:\\n'\"$HITS\"'\\nConsider running /react-craft:audit'; fi; fi"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "if echo \"$TOOL_INPUT_COMMAND\" | grep -q 'git commit'; then UI_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '\\.(tsx|jsx|css|scss)$' | head -5); if [ -n \"$UI_FILES\" ]; then echo '[react-craft] UI files in commit:\\n'\"$UI_FILES\"'\\nRun /react-craft:audit for DS compliance.'; fi; fi"
        }]
      }
    ]
  }
}
```

### AI-Powered Hooks (Semantic, via CLAUDE.md)
The `/init` command adds instructions to the project's CLAUDE.md:
```markdown
## After Editing UI Files
After editing any .tsx, .jsx, .css, or .scss file, run the token-validator
skill to check for hardcoded values before proceeding.
```

This dual strategy gives fast deterministic checks on every edit + deeper semantic checks when Claude is actively working.

### Hook Events Used

| Hook Event | Matcher | What Happens |
|------------|---------|--------------|
| `PostToolUse` | `Edit\|Write` on UI files | Quick grep for hardcoded colors, warns in conversation |
| `PreToolUse` | `Bash` with `git commit` | Lists UI files in commit, suggests audit |
| `Stop` | — | (Optional) Agent hook verifying all quality gates passed before stopping |
| `SubagentStop` | Code Writer | After code generation, auto-trigger a11y auditor |

## Future Extension Point: Figma-to-Code Drift Detection

When working on an existing component library, Figma and code can drift apart — props renamed in code but not Figma, new variants in Figma not yet implemented, deprecated patterns still in Figma. We are NOT building this now, but the toolchain must be extensible to accept a drift checker.

### How It Would Plug In

A drift checker is a custom pipeline skill that:
1. Compares the Figma Console MCP output (design truth) against the Storybook MCP manifest (code truth)
2. Identifies discrepancies: missing variants, renamed props, deprecated patterns, new tokens
3. Classifies each drift as: **code-behind** (Figma is ahead), **figma-behind** (code is ahead), or **conflict** (both changed)
4. Guides conflict resolution by presenting options to the developer and nudging them to consult the design system team

```yaml
pipeline:
  # ... existing steps ...
  - skill: custom
    path: ".claude/skills/figma-code-drift/SKILL.md"
    config:
      figma_source: "figma-console-mcp"
      code_source: "storybook-mcp"
      resolution_mode: "assisted"  # or "report-only"
```

The existing `@ds-deviation` comment pattern and Deviation Tracker classification system naturally extend to drift findings. No architectural changes needed — just a new SKILL.md that reads from both MCPs.

## Design System Team Communication

Most design system teams have a Slack channel (or equivalent). When the agent encounters ambiguity, it must nudge the developer to reach out to the DS team rather than guessing.

### Configuration

```yaml
design_system:
  name: "Acme Design System"
  support_channel: "https://slack.com/app_redirect?channel=C0123DESIGN"  # or Teams/Discord URL
  support_label: "#design-system-help on Slack"  # Human-readable label
```

### When to Nudge

The agent surfaces the DS team contact in these situations:
- **Deviation Tracker `needs-review` findings** — "Not sure if this deviation is intentional? Ask the DS team: #design-system-help on Slack"
- **Component Architect can't find a DS equivalent** — "No design system component matches this pattern. Before building custom, check with the DS team: [link]"
- **Guardian detects a component with known limitations** — "AcmeSelect doesn't support grouped options. The DS team may have a workaround: [link]"
- **Token Validator finds approximate but not exact matches** — "Closest token is `--acme-spacing-sm` (8px) but you used 12px. Check with the DS team if a new token is needed: [link]"
- **Drift checker (future) finds conflicts** — "Figma and code disagree on this component's API. Coordinate with the DS team: [link]"

### Implementation

Every agent that produces `needs-review` findings appends the support channel nudge. The `react-craft.config.yaml` `support_channel` and `support_label` fields are read by the Deviation Tracker and included in:
- Conversation output (inline nudges)
- YAML deviation reports (machine-readable)
- `@ds-deviation` comment suggestions (when proposing that the developer add one)

## What We Chose NOT to Build

| Skipped | Reason |
|---------|--------|
| Full agile lifecycle (PRD->Epics->Sprints) | Overkill for component scope. BMAD handles this if needed. |
| `disable-model-invocation` orchestration | Our pipeline is more linear than CE's meta-commands |
| Per-agent sidecar memory | Config file + CLAUDE.md handles persistence |
| Deployment verification / rollback | We build components, not deploy services |
| Character-named personas (Amelia, Murat) | Domain expertise defines our agents, not character names |
| Duplicate enforcement skills | Prior toolkit (2026-03-05) already built Guardian, Token Validator, Implementation Checker, Deviation Tracker. Bundle, don't rebuild. |
| Custom plugin-to-plugin extension API | Claude Code doesn't support this. Use filesystem discovery (deepen-plan pattern) + configurable pipeline instead. |

## Next Steps

1. Create the plugin scaffold (`react-craft/`)
2. Write the `/init` command (codebase detection)
3. Port enforcement skills from prior toolkit
4. Build creation agents one at a time, starting with Design Analyst
5. Wire hooks
6. Set up eval fixtures with Figma files
7. Write README and docs for open-source launch
