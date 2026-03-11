# react-craft

**Multi-agent Figma-to-component pipeline for React.**

react-craft codifies 20 years of frontend expertise into a team of specialized AI agents that turn Figma designs into production-ready React components. Each agent owns a specific stage of the pipeline — extracting design specs, designing component APIs, writing code, and running quality checks — so the output meets the standards a senior developer would set by hand.

## Quick Start

### 1. Install the plugin

Add react-craft to your Claude Code plugins:

```
claude plugin add react-craft
```

### 2. Initialize your project

```
/react-craft:init
```

This creates a `react-craft.config.yaml` in your project root with your React version, styling approach, component output directory, and other conventions.

### 3. Build a component

```
/react-craft:build https://figma.com/design/abc123?node-id=1:42
```

Provide a Figma node-level URL. The pipeline runs seven agents (with parallel execution for a11y and stories), producing a fully implemented component with types, accessibility validation, Storybook stories, visual fidelity verification, and documentation.

### 4. Audit existing components

```
/react-craft:audit src/components/Button
```

Run the enforcement skills (Guardian, Token Validator, Implementation Checker, Deviation Tracker) against existing components to check design system compliance. Add `--custom` to also run custom pipeline skills.

### 5. Evaluate pipeline quality

```
/react-craft:eval
/react-craft:eval --fixture=material-button
/react-craft:eval --fixture=material-button --compare=<previous-run-id>
```

Run the eval suite against component fixtures to measure pipeline output quality. Supports deterministic graders (TypeScript, lint, axe-core, stories) and LLM-as-judge graders (visual fidelity, API quality, code readability).

#### Build Options

- **`--best-effort`** — Skip all human gates. The pipeline uses agent judgment for ambiguity instead of stopping to ask.
- **`--dry-run`** — Run Design Analyst and Component Architect only. Produces the component brief and architecture without generating code, stories, or running quality checks. Useful for reviewing the plan before committing to a full build.
- **`--resume <ComponentName>`** — Resume a previously failed pipeline from the last failed step.

```
/react-craft:build https://figma.com/design/abc123?node-id=1:42 --best-effort
/react-craft:build https://figma.com/design/abc123?node-id=1:42 --dry-run
/react-craft:build --resume DataTable
```

## Architecture

react-craft uses a pipeline of specialized agents. Each agent reads the upstream output, does its job, and writes a structured handoff document for the next.

### v0.3 Pipeline (7 agents)

```
Design Analyst → Component Architect → Code Writer → [Accessibility Auditor ∥ Story Author] → Visual Reviewer → Quality Gate
```

1. **Design Analyst** — Extracts and validates design specs from Figma, produces the component brief
2. **Component Architect** — Designs component API: prop interfaces, composition strategy, file structure
3. **Code Writer** — Implements components following brief, architecture, and project conventions
4. **Accessibility Auditor** — Reviews from disability perspective, runs axe-core and keyboard tests *(parallel with 5)*
5. **Story Author** — Creates Storybook stories covering every state and edge case *(parallel with 4)*
6. **Visual Reviewer** — Screenshots Figma and Storybook, compares across 9 dimensions, applies iterative fixes
7. **Quality Gate** — Runs TypeScript, linting, formatting, and Storybook tests; final mechanical validation

Steps 4 and 5 run in parallel after Code Writer completes. If the Accessibility Auditor finds P1 (blocker) issues, Code Writer remediates and stories are regenerated. The Visual Reviewer then compares the rendered output against the Figma design before the Quality Gate runs.

### Visual Review

The Visual Reviewer compares rendered Storybook stories against Figma designs across 9 dimensions:

| Dimension | What It Checks |
|-----------|---------------|
| Layout | Element positioning, flex/grid alignment, overall structure |
| Typography | Font family, size, weight, line-height, letter-spacing |
| Colors | Background, text, border colors, opacity |
| Spacing | Padding, margin, gaps between elements |
| Shadows | Box-shadow, drop-shadow presence and values |
| Borders | Border width, style, color |
| Border-radius | Corner rounding values |
| Icons | Presence, size, positioning, color |
| States | Hover, focus, active, disabled visual treatments |

Discrepancies are classified as CRITICAL, MODERATE, or MINOR. The agent applies up to 5 iterative fixes for critical/moderate issues, prioritizing structure over polish. It caches the Figma reference screenshot and uses a diminishing-returns threshold to avoid wasting tokens on minor tweaks.

Requires Playwright MCP for screenshots. If unavailable, the step is skipped gracefully.

### Accessibility Testing

The Accessibility Auditor uses an 8-layer testing stack:

1. Static analysis of JSX (semantic HTML, ARIA attributes)
2. axe-core automated checks via Storybook a11y addon
3. Keyboard navigation testing via Playwright MCP
4. Screen reader announcement validation
5. Color contrast verification against WCAG AA
6. Focus management and tab order review
7. Reduced motion / prefers-contrast support
8. Touch target sizing (mobile-first)

### Storybook Integration

When Storybook is detected in your project, react-craft:

- Generates stories covering all component states, variants, and edge cases
- Runs `npx storybook test --ci` as part of the Quality Gate
- Uses the Storybook MCP addon for interactive testing when available
- Includes a11y checks via the Storybook a11y addon (axe-core)

## Compatibility

react-craft works standalone and integrates with other Claude Code plugins for enhanced capabilities.

| Setup | What You Get |
|-------|-------------|
| **react-craft alone** | Full Figma-to-component pipeline with 7 agents |
| **react-craft + CE** | Enhanced with Compound Engineering's orchestration and agent coordination |
| **react-craft + BMAD** | Enhanced with BMAD's workflow management and project methodology |
| **react-craft + CE + BMAD** | Full stack: methodology, orchestration, and component pipeline |

## `--best-effort` Mode

When `--best-effort` is set, the pipeline runs autonomously without stopping for human input:

| Situation | Default Behavior |
|-----------|-----------------|
| Figma link lacks node-id | Continue with warning |
| Brief has pending items | Mark as assumed with reasoning |
| Git branch already exists | Reuse existing branch |
| Artifact hash mismatch on resume | Continue with warning |
| Visual Reviewer CRITICAL findings | Log as unresolved and continue |
| Quality Gate fails | Attempt remediation (max 3 tries) |
| Concurrent pipeline detected | Warn and stop (never override — data safety) |

This is useful for batch workflows or when you trust the pipeline's judgment.

## Security Model

- **Figma data sanitization** — Component names, variant names, and CSS classes are validated against strict patterns before use
- **Path canonicalization** — All output paths are validated to stay within the project directory
- **Prompt injection defense** — Figma-sourced text is wrapped in `[FIGMA_DATA]` delimiters so agents distinguish design data from instructions
- **Artifact integrity** — SHA-256 hashes verify pipeline artifacts haven't been tampered with between agent steps
- **Script execution** — react-craft executes user-defined scripts from package.json (lint, format, typecheck) during quality checks. These run with your shell's permissions. Review scripts during `/react-craft:init` when prompted

## Hooks

react-craft includes shell-based hooks that run automatically during development:

- **PostToolUse (Edit/Write)** — Scans `.tsx`, `.jsx`, `.css`, and `.scss` files for hardcoded hex colors and suggests running `/react-craft:audit`
- **PostToolUse (Write)** — Notifies when a new UI file is created, prompting an audit
- **PreToolUse (Bash)** — Detects UI files in staged git commits and recommends a compliance check before committing

These hooks are deterministic shell checks — they run instantly with no AI cost. Customize them by editing `hooks/hooks.json` in the plugin directory.

react-craft uses a dual strategy for enforcement:

1. **Shell hooks** (`hooks.json`) — fast, mechanical pattern detection (e.g., hardcoded colors, file creation alerts)
2. **CLAUDE.md instructions** — semantic guidance that agents follow contextually (e.g., "use tokens over hardcoded values")

Together, they catch issues at two levels: hooks catch what grep can find; CLAUDE.md instructions catch what requires understanding.

## Custom Pipeline Skills

You can extend the pipeline with custom validation skills. Any SKILL.md that follows the custom skill contract can be plugged in via config:

```yaml
pipeline:
  custom_skills:
    - path: ".claude/skills/i18n-checker/SKILL.md"
      config:
        default_locale: "en-US"
        frameworks: ["react-intl", "i18next"]
    - path: ".claude/skills/content-strategy/SKILL.md"
      readonly: true
      config:
        tone_guide: "docs/content/tone-guide.md"
```

Custom skills must: accept file paths as input, output findings in `[SEVERITY] file:line — category: description` format, and be self-contained. See `examples/custom-skills/i18n-checker/` for a working example and `skills/references/custom-skill-contract.md` for the full contract.

## Known Limitations (v0.3)

- Single component per pipeline run (no batch mode)
- Eval fixtures limited to Material Design, Apple HIG, and adversarial test cases
- No Figma-to-code drift detection (documented as future extension point)

## Roadmap

### v0.1
- Plugin scaffold and shared documents
- `/react-craft:init` and `/react-craft:build` commands
- Design Analyst, Component Architect, Code Writer, Quality Gate agents
- Component brief and architecture templates

### v0.2
- Accessibility Auditor and Story Author agents (parallel execution)
- `/react-craft:audit` command for design system compliance
- Enforcement skills: Guardian, Token Validator, Implementation Checker, Deviation Tracker
- Storybook story generation and `npx storybook test --ci` in Quality Gate
- axe-core automated accessibility testing (8-layer stack)
- `--dry-run` flag for plan-only builds
- Shell hooks for hardcoded value detection and commit-time audits
- Reference docs for a11y patterns, Storybook best practices, and design tokens

### v0.3 (current)
- Visual Reviewer agent (9-dimension Figma comparison with iterative fixes)
- `/react-craft:eval` command with fixture-based evaluation and benchmark reports
- Custom pipeline skill slots (plug in i18n, content strategy, etc.)
- Agent prompt versioning for eval reproducibility
- A/B testing for comparing skill versions

### v0.4
- Documentation site (GitHub Pages)
- GitHub Actions CI for eval-on-PR
- Demo video
- Figma-to-code drift detection

## License

[MIT](./LICENSE)
