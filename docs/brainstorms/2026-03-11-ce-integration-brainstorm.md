# Brainstorm: react-craft + Compound Engineering Integration Guide

**Date:** 2026-03-11
**Status:** Complete
**Next step:** `/ce:plan`

## What We're Building

A documentation guide and `/init` enhancement that enables react-craft to integrate with the Compound Engineering (CE) plugin through CE's native `compound-engineering.local.md` configuration file.

### Deliverables

1. **`react-craft/docs/ce-integration.md`** — A guide mapping CE agents to react-craft pipeline stages, with setup instructions and usage examples.
2. **`/init` CE detection** — During `/react-craft:init`, auto-detect whether CE is installed. If yes, prompt the user to enable CE integration, then write react-craft-specific entries into `compound-engineering.local.md`.
3. **Updated README** — Expand the compatibility table to reference the integration guide.

## Why This Approach

### Config-native integration via `compound-engineering.local.md`

CE's configuration file uses YAML frontmatter (`review_agents`, `plan_review_agents`) plus a free-text markdown body for review context. react-craft hooks into this existing mechanism rather than inventing its own:

- **No new config format** — reuses what CE already reads at runtime
- **No coupling** — react-craft still works standalone; CE entries are additive
- **Familiar to CE users** — same file they already customize
- **Auto-detected defaults** — CE falls back to project-type defaults if the file doesn't exist, so react-craft additions are purely additive

### Alternative approaches considered

| Approach | Why not |
|----------|---------|
| Dual-config (`react-craft.config.yaml` ce_integration section) | Adds coupling between two configs; CE wouldn't read it natively |
| Guide-only (no automation) | Requires manual setup; error-prone |
| BMAD + CE combined guide | Scope creep; BMAD can get its own guide later |

## Key Decisions

### 1. CE agent mapping to react-craft pipeline stages

| react-craft Stage | CE Agent | When / Why |
|-------------------|----------|------------|
| Post Quality Gate | `kieran-typescript-reviewer` | Deep TypeScript review of generated component code |
| Post Quality Gate | `code-simplicity-reviewer` | Ensure generated code is minimal and clean |
| Post Quality Gate | `security-sentinel` | Catch XSS, injection risks in generated components |
| Post Quality Gate | `performance-oracle` | Flag performance issues (re-renders, memo gaps) |
| Post Quality Gate | `pattern-recognition-specialist` | Verify generated code follows codebase patterns |
| Visual Review | `design-iterator` | Iterative screenshot-based visual refinement (supplements react-craft's Visual Reviewer) |
| Visual Review | `figma-design-sync` | Pixel-level Figma-to-implementation diff |
| Post Audit | `architecture-strategist` | Review component architecture decisions |
| Spec Phase | `spec-flow-analyzer` | Analyze component spec for missing user flows |

### 2. `/init` CE detection flow

1. Check if CE plugin is installed (look for `compound-engineering` in installed plugins or `.claude/plugins`)
2. If detected, prompt: "Compound Engineering detected. Enable CE integration for react-craft reviews?"
3. If yes:
   - Read existing `compound-engineering.local.md` (or create if absent)
   - Merge react-craft-recommended agents into `review_agents` (don't duplicate)
   - Append `## react-craft Integration` section to markdown body with review context
4. If no: skip, note in output that CE integration can be enabled later

### 3. Review context content

The markdown body section tells CE agents how to review react-craft output:

```markdown
## react-craft Integration

This project uses react-craft for Figma-to-component generation.

When reviewing react-craft output in `docs/react-craft/components/`:
- Check component API against the component's `brief.md`
- Validate design token usage (no hardcoded colors, spacing, typography)
- Verify accessibility audit findings are resolved
- Run visual comparison against Figma if link is available in brief
- Check Story coverage matches all states described in architecture.md
```

### 4. Scope: CE only, not BMAD

BMAD integration is a separate future effort. This guide focuses exclusively on CE.

### 5. Guide location

- Primary: `react-craft/docs/ce-integration.md` (ships with plugin)
- `/init` references the guide when CE is detected
- README links to the guide from the compatibility table

## Resolved Questions

- **Q: Should react-craft invoke CE agents directly during `/build`?**
  A: No. react-craft writes config; CE's own commands (`/ce:review`) use it. This keeps the plugins decoupled.

- **Q: What if the user doesn't have CE installed?**
  A: `/init` skips CE setup entirely. The guide documents manual setup for users who install CE later.

- **Q: Should we add CE agents to `plan_review_agents` too?**
  A: Yes — `architecture-strategist` and `code-simplicity-reviewer` are useful for reviewing react-craft plans.

## Open Questions

None — all questions resolved during brainstorm.
