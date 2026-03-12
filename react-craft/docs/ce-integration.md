# Using react-craft with Compound Engineering

## Overview

When both plugins are installed, react-craft can configure Compound Engineering's review agents to provide enhanced code review of generated components. CE agents review react-craft output after the pipeline completes — catching issues that react-craft's own Quality Gate and enforcement skills might miss.

The integration is **config-native**: react-craft writes into CE's `compound-engineering.local.md` file so that `/ce:review` automatically includes react-craft-aware context. No bridge config, no runtime coupling.

## Prerequisites

- react-craft plugin installed and initialized (`/react-craft:init`)
- Compound Engineering plugin installed (tested with CE v2.38+)

## Setup

Run `/react-craft:init` in your project. If CE is detected, you will be prompted:

> Compound Engineering detected. Enable CE integration for react-craft reviews? (y/n)

Answering **yes** writes two things into `compound-engineering.local.md`:

1. **Review agents** — Adds `pattern-recognition-specialist` and `architecture-strategist` to the `review_agents` list (if not already present). These complement CE's default TypeScript reviewers.
2. **Review context** — Appends a `## react-craft Integration` section to the markdown body with project-specific guidance for CE agents reviewing react-craft output.

### Manual Setup (if CE installed after init)

Re-run `/react-craft:init`. The command re-detects CE each time — no persistent state to manage.

### Using `--defaults` Mode

With `--defaults`, CE integration is **skipped** (writing to another plugin's config requires explicit consent). To enable CE integration in non-interactive mode, use:

```
/react-craft:init --defaults --ce=enabled
```

## How It Works

```
/react-craft:build <figma-url>     # react-craft generates component
/ce:review                          # CE reviews with react-craft context
```

react-craft writes configuration into CE's native `compound-engineering.local.md` at your project root. When you run `/ce:review` or `/ce:work`, CE reads this file and its review agents receive the react-craft context — they know to check component APIs against briefs, validate token usage, and verify a11y audit findings.

The two plugins never invoke each other. They share a file, not code.

## Agent Mapping

These CE agents are most useful for reviewing react-craft output:

| react-craft Stage | CE Agent | Purpose |
|-------------------|----------|---------|
| Post Quality Gate | `pattern-recognition-specialist` | Verify generated code follows codebase patterns |
| Post Quality Gate | `architecture-strategist` | Review component architecture decisions |
| Post Quality Gate | `kieran-typescript-reviewer` | Deep TypeScript review (CE default) |
| Post Quality Gate | `code-simplicity-reviewer` | Ensure code is minimal (CE default) |
| Post Quality Gate | `security-sentinel` | Catch XSS, injection risks (CE default) |
| Post Quality Gate | `performance-oracle` | Flag re-renders, memo gaps (CE default) |
| Visual Review | `design-iterator` | Iterative screenshot refinement |
| Visual Review | `figma-design-sync` | Pixel-level Figma diff |
| Spec Phase | `spec-flow-analyzer` | Analyze spec for missing flows |

`/init` adds `pattern-recognition-specialist` and `architecture-strategist` to your config. The others are CE defaults for TypeScript projects — they are likely already in your `review_agents` list.

## Recommended Workflow

1. **Build** — Run `/react-craft:build <figma-url>` to generate a component
2. **Review** — Run `/ce:review` to get CE agent feedback on the generated code
3. **Iterate** — Fix findings from both react-craft's Quality Gate and CE's reviewers
4. **Audit** — Run `/react-craft:audit` for design system compliance, then `/ce:review` again

For the most thorough review, run both react-craft's enforcement skills (`/react-craft:audit`) and CE's review agents (`/ce:review`). They check different things:

| react-craft `/audit` checks | CE `/ce:review` checks |
|-----------------------------|----------------------|
| Design token usage | TypeScript type safety |
| Component DS compliance | Code simplicity and patterns |
| Accessibility patterns | Security vulnerabilities |
| Design deviation tracking | Performance bottlenecks |

## Customization

### Adding or removing review agents

Edit `compound-engineering.local.md` directly. Your changes are preserved across `/react-craft:init` re-runs — init only adds agents, never removes them.

### Customizing review context

Edit the text between the `<!-- react-craft:start -->` and `<!-- react-craft:end -->` markers. Add project-specific review criteria that CE agents should follow when reviewing react-craft output.

### Disabling CE integration

Remove the `<!-- react-craft:start -->` ... `<!-- react-craft:end -->` block from `compound-engineering.local.md`, and remove `pattern-recognition-specialist` and `architecture-strategist` from `review_agents` if you added them solely for react-craft.

## Troubleshooting

**CE `setup` skill overwrites react-craft entries:**
CE's `/setup` skill rewrites `compound-engineering.local.md` from scratch. If you run it after `/react-craft:init`, react-craft entries are removed. Fix: re-run `/react-craft:init` to restore them.

**Agent not found errors:**
CE agent names may change between versions. The mapping above was tested with CE v2.38+. Unknown agent names are silently ignored by CE — they won't cause errors, but they won't run either. Check CE's release notes if agents seem missing.

**Detection fails:**
react-craft detects CE by reading `~/.claude/plugins/installed_plugins.json`. If CE was installed via a non-standard method, detection may fail. You can set up the integration manually by editing `compound-engineering.local.md` directly — add the agents and review context described in the Setup section above.
