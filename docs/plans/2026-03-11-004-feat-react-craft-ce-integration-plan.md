---
title: "feat: Add Compound Engineering integration guide and /init detection"
type: feat
status: completed
date: 2026-03-11
origin: docs/brainstorms/2026-03-11-ce-integration-brainstorm.md
deepened: 2026-03-11
---

# Add Compound Engineering Integration Guide and /init Detection

## Enhancement Summary

**Deepened on:** 2026-03-11
**Agents used:** architecture-strategist, code-simplicity-reviewer, agent-native-reviewer, pattern-recognition-specialist, security-sentinel, create-agent-skills, agent-native-architecture, plugin-detection-researcher

### Critical Fixes (P0)

1. **Detection mechanism is wrong** — Glob paths don't match reality. CE lives at `~/.claude/plugins/cache/compound-engineering-plugin/...`. Correct approach: read `installed_plugins.json` via `Bash(node ...)`.
2. **File path is wrong** — CE reads `compound-engineering.local.md` from **project root**, not `.claude/`. Writing to `.claude/compound-engineering.local.md` would silently do nothing.

### Key Changes from Original Plan

- Detection: `installed_plugins.json` via node (not Glob on cache paths)
- File path: `$CWD/compound-engineering.local.md` (not `.claude/`)
- Step placement: Detection at Step 2i, writing at Step 4b (not Step 1d)
- `--defaults`: Auto-skip CE (not auto-enable) — cross-plugin side effects require consent
- Dropped `ce_integration` config field — re-detect each time, like every other `/init` step
- Collapsed 3 phases into 1 implementation checklist
- Dynamic review context based on detection results
- CE steps extracted to reference file (init.md approaching 500-line limit)
- Security validations: plugin.json contents, YAML structure, marker invariants

## Overview

Enable react-craft to integrate with the Compound Engineering (CE) plugin through CE's native `compound-engineering.local.md` configuration file. This includes auto-detection during `/init`, a documentation guide mapping CE agents to react-craft pipeline stages, and an updated README.

(See brainstorm: `docs/brainstorms/2026-03-11-ce-integration-brainstorm.md`)

## Problem Statement

react-craft's README claims CE compatibility but provides no documentation on _how_ the two plugins work together. Users who have both installed get no guidance on which CE agents complement react-craft's pipeline, and no automated setup.

## Proposed Solution

**Config-native integration** — react-craft writes into CE's existing `compound-engineering.local.md` rather than inventing a separate integration mechanism. This keeps both plugins decoupled while providing a seamless experience.

(See brainstorm: rejected alternatives — dual-config and guide-only approaches)

### Research Insights: Why Config-Native Is Correct

**Architecture review confirms:** The integration is unidirectional (react-craft writes, CE reads), uses the loosest coupling possible (shared file, no code/API dependency), and follows CE's own grain (CE's `setup` skill writes the same file in the same format). Either plugin can be removed without breaking the other.

**Agent-native review confirms:** The shared-workspace pattern (both plugins read/write the same file) aligns with single-source-of-truth principles and avoids the sandbox anti-pattern of creating a bridge config.

## Technical Approach

### CE Detection Mechanism

> **CORRECTED from original plan.** The original Glob-based detection targeted paths that don't exist. The `~/.claude/plugins/cache/` directory contains stale/orphaned plugin versions. The canonical source of truth is `installed_plugins.json`.

The `/init` command runs with `disable-model-invocation: true` and restricted tools. Detection reads `installed_plugins.json` via `Bash(node ...)`:

```javascript
// Bash(node -e '...')
node -e "
  const fs = require('fs');
  const home = require('os').homedir();
  const path = home + '/.claude/plugins/installed_plugins.json';
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const ceKey = Object.keys(data.plugins).find(k => k.startsWith('compound-engineering@'));
    if (ceKey) {
      const entries = data.plugins[ceKey].filter(e => e.scope === 'user');
      if (entries.length > 0) {
        console.log(JSON.stringify({ installed: true, version: entries[0].version }));
      } else {
        console.log(JSON.stringify({ installed: false }));
      }
    } else {
      console.log(JSON.stringify({ installed: false }));
    }
  } catch(e) {
    console.log(JSON.stringify({ installed: false }));
  }
"
```

**Why this approach:**
- `Bash(node *)` matches `/init`'s `allowed-tools` pattern
- Parses the canonical source of truth, not cache directory structure
- Distinguishes `user` vs `local` scope
- Handles missing file, malformed JSON, and absent CE gracefully
- Returns structured JSON for the agent to parse

**Security validation:** After detection, verify the plugin name in the result matches `compound-engineering` (prevents spoofing by similarly-named plugins).

### File Path

> **CORRECTED from original plan.** CE reads `compound-engineering.local.md` from the **project root**, not under `.claude/`.

All reads and writes target `$CWD/compound-engineering.local.md`.

### Agents Added to `review_agents`

These are **CE's own agents** recommended for reviewing react-craft-generated code (not react-craft agents injected into CE). Only add agents not already present:

```yaml
# Added if not already present
- pattern-recognition-specialist  # Verify generated code follows codebase patterns
- architecture-strategist         # Review component architecture decisions
```

> **Simplified from original.** The original plan listed 6 agents including CE defaults (kieran-typescript-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle). These are CE's standard TypeScript project agents and are likely already present. Only add the 2 that CE doesn't include by default.

### Agents Added to `plan_review_agents`

```yaml
# Added if not already present
- architecture-strategist
- code-simplicity-reviewer
```

### Review Context Section

> **Enhanced from original.** The review context is now **dynamic**, adapting to what `/init` actually detected about the project.

Appended to the markdown body of `compound-engineering.local.md` using `<!-- react-craft:start -->` / `<!-- react-craft:end -->` markers (same pattern as CLAUDE.md Step 4):

```markdown
<!-- react-craft:start -->
## react-craft Integration

This project uses react-craft for Figma-to-component generation.

When reviewing react-craft output in `{components_dir}`:
- Check component API against the component's `brief.md`
{if has_design_tokens}- Validate design token usage (no hardcoded colors, spacing, typography){/if}
- Verify accessibility audit findings are resolved
{if has_figma_mcp}- Run visual comparison against Figma if link is available in brief{/if}
{if has_storybook}- Check Story coverage matches all states described in architecture.md{/if}
<!-- react-craft:end -->
```

The `{if ...}` conditionals are resolved at init time using detection results from Steps 2a-2h. The written output is plain markdown with no template syntax.

### Idempotency

Use the same `<!-- react-craft:start/end -->` marker pattern as CLAUDE.md (Step 4). YAML agents are deduplicated by name (set-based, add-only).

**Marker validation (security):** Before replacement, verify exactly one start marker and one end marker exist, with start before end. If violated, warn and append a fresh block rather than attempting partial replacement.

### `--defaults` Flag Behavior

> **Changed from original.** Writing to another plugin's config file is a cross-plugin side effect that requires consent.

When `--defaults` is set and CE is detected: **auto-skip** CE integration. Log: `"CE detected. Run /react-craft:init (without --defaults) to enable CE integration."`

When `--defaults` is set and CE is not detected: skip silently.

**Explicit flag:** Support `--ce=enabled` to opt in during `--defaults` mode. This enables CI/automation use cases where the caller wants both `--defaults` and CE integration.

### `disable-model-invocation: true` Is Security-Critical

> **New section from security review.**

The `/init` command's `disable-model-invocation: true` setting eliminates the entire class of prompt injection attacks that could be triggered by malicious content in `compound-engineering.local.md`. This restriction must not be relaxed without re-evaluating injection risks from untrusted file content.

## Implementation Checklist

> **Collapsed from 3 phases.** The total deliverables are: one docs file, additions to init.md (extracted to a reference file), and one README line change. This is one unit of work.

### Files to Create

1. **`react-craft/docs/ce-integration.md`** — Integration guide

   ```markdown
   # Using react-craft with Compound Engineering

   ## Overview
   When both plugins are installed, react-craft can configure CE's review
   agents to provide enhanced code review of generated components.

   ## Prerequisites
   - react-craft plugin installed and initialized (`/react-craft:init`)
   - Compound Engineering plugin installed (tested with v2.38+)

   ## Setup
   Run `/react-craft:init` in your project. If CE is detected, you will
   be prompted to enable integration. This writes two things:
   1. Recommended review agents into `compound-engineering.local.md` frontmatter
   2. react-craft-specific review context into the markdown body

   ### Manual Setup (if CE installed after init)
   Re-run `/react-craft:init`. The command re-detects CE each time.

   ## How It Works
   react-craft writes configuration into CE's native `compound-engineering.local.md`.
   When you run `/ce:review` or `/ce:work`, CE reads this file and its review
   agents receive the react-craft context.

   ## Agent Mapping
   These CE agents are most useful for reviewing react-craft output:

   | react-craft Stage | CE Agent | Purpose |
   |-------------------|----------|---------|
   | Post Quality Gate | pattern-recognition-specialist | Verify generated code follows codebase patterns |
   | Post Quality Gate | architecture-strategist | Review component architecture decisions |
   | Post Quality Gate | kieran-typescript-reviewer | Deep TypeScript review (CE default) |
   | Post Quality Gate | code-simplicity-reviewer | Ensure code is minimal (CE default) |
   | Post Quality Gate | security-sentinel | Catch XSS, injection risks (CE default) |
   | Post Quality Gate | performance-oracle | Flag re-renders, memo gaps (CE default) |
   | Visual Review | design-iterator | Iterative screenshot refinement |
   | Visual Review | figma-design-sync | Pixel-level Figma diff |
   | Spec Phase | spec-flow-analyzer | Analyze spec for missing flows |

   `/init` adds `pattern-recognition-specialist` and `architecture-strategist`
   to your config. The others are CE defaults for TypeScript projects.

   ## Recommended Workflow
   1. Run `/react-craft:build <figma-url>` to generate a component
   2. Run `/ce:review` to get CE agent feedback on the generated code
   3. Iterate based on findings

   ## Customization
   Edit `compound-engineering.local.md` directly to add/remove agents or
   modify the review context. Your changes are preserved on `/init` re-runs
   (except agent additions, which are set-based: init only adds, never removes).

   ## Troubleshooting

   **CE setup skill overwrites react-craft entries:**
   CE's `/setup` skill rewrites the file from scratch. Re-run `/react-craft:init`
   to restore react-craft entries.

   **Agent not found errors:**
   Check your CE version. Agent names may change between versions. The mapping
   above was tested with CE v2.38+.

   **Disabling CE integration:**
   Remove the `<!-- react-craft:start -->` ... `<!-- react-craft:end -->` block
   from `compound-engineering.local.md`, and remove the agents react-craft added
   from the `review_agents` list.
   ```

2. **`react-craft/skills/references/ce-integration-steps.md`** — Reference file for `/init` CE detection and writing logic (extracted to keep init.md under 500 lines)

   Contains the full procedural steps for:
   - CE detection via `installed_plugins.json`
   - YAML frontmatter merge with validation
   - Dynamic review context generation
   - Marker-based idempotent write
   - Security validations (YAML structure, marker invariants, agent name format)

### Files to Modify

3. **`react-craft/commands/react-craft/init.md`** — Add two steps:

   **Step 2i — CE Detection and Integration** (in convention detection section, after Step 2h)

   ```markdown
   ### Step 2i — Compound Engineering Detection

   Detect CE plugin:
   Bash(node -e '...') — read ~/.claude/plugins/installed_plugins.json,
   check for key starting with "compound-engineering@".

   If detected and NOT --defaults and NOT --ce flag:
     Prompt: "Compound Engineering detected. Enable CE integration? (y/n)"

   If detected and --defaults: skip CE integration, log message.
   If detected and --ce=enabled: enable without prompting.
   If not detected: note in summary.

   See references/ce-integration-steps.md for full procedure.
   ```

   **Step 4b — Write CE Config** (after Step 4 CLAUDE.md update, before Step 5)

   ```markdown
   ### Step 4b — Write CE Integration (if enabled in Step 2i)

   See references/ce-integration-steps.md for:
   - Read compound-engineering.local.md from project root
   - Validate YAML structure (review_agents must be string array)
   - Validate agent names match ^[a-z0-9-]+$
   - Add agents (set-based dedup)
   - Generate dynamic review context from detection results
   - Write with marker-based idempotency
   - Verify write succeeded (read-back check)
   ```

   **Step 6 — Summary** (add CE row in plain-text colon-aligned format)

   ```
     CE integration: enabled (2 review agents added)
   ```
   or:
   ```
     CE integration: not detected
   ```

4. **`react-craft/README.md`** — Update compatibility table row:

   ```markdown
   | **react-craft + CE** | Enhanced code review via CE agents. [Setup guide →](docs/ce-integration.md) |
   ```

## Acceptance Criteria

### Functional Requirements

- [x] `react-craft/docs/ce-integration.md` exists with complete guide
- [x] `react-craft/skills/references/ce-integration-steps.md` exists with procedural steps
- [x] `/init` detects CE via `installed_plugins.json` (not Glob on cache paths)
- [x] `/init` prompts user when CE detected (auto-skips with `--defaults`)
- [x] `/init` supports `--ce=enabled` flag for explicit opt-in
- [x] `/init` writes to `$CWD/compound-engineering.local.md` (project root, not `.claude/`)
- [x] `/init` adds 2 agents to `review_agents` and 2 to `plan_review_agents` (deduped)
- [x] `/init` writes dynamic review context with `<!-- react-craft:start/end -->` markers
- [x] `/init` preserves all existing CE config (agents, custom body content)
- [x] Re-running `/init` is idempotent
- [x] Summary shows CE status in colon-aligned format
- [x] README links to `docs/ce-integration.md`

### Security Validations

- [x] YAML frontmatter validated: `review_agents` must be array of strings (or absent)
- [x] Agent name strings validated: `^[a-z0-9-]+$` pattern
- [x] File size check before parsing (reject >50KB)
- [x] Marker invariants checked: exactly one start, one end, start before end
- [x] `disable-model-invocation: true` documented as security-critical

### Edge Cases

- [x] CE not installed → skip gracefully, note in summary
- [x] User declines CE → skip, re-prompted on next run (no persistent state)
- [x] `compound-engineering.local.md` exists with custom content → preserved
- [x] `compound-engineering.local.md` has malformed YAML → warn, skip CE, don't crash
- [x] CE `setup` skill overwrites file → next `/init` re-adds (markers missing = re-append)
- [x] `--defaults` mode → auto-skip CE integration with log message
- [x] `--defaults --ce=enabled` → enable without prompting

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CE renames agents | Low | Document "tested with CE v2.38+"; unknown agents are harmless |
| CE `setup` clobbers entries | Medium | Document in guide; `/init` re-adds entries on next run |
| `installed_plugins.json` format changes | Low | Fail open (warn, don't block); node script handles missing file |
| Malicious `compound-engineering.local.md` | Medium | YAML validation, agent name validation, `disable-model-invocation` protection |
| Spoofed plugin in `installed_plugins.json` | Low | Verify plugin key starts with `compound-engineering@` |
| init.md exceeds 500 lines | Medium | CE steps extracted to reference file |

## Known Limitations

1. **No agent validation** — react-craft cannot verify recommended CE agents exist in the installed CE version. Invalid names are silently ignored by CE.
2. **CE `setup` clobbering** — CE's `setup` skill rewrites `compound-engineering.local.md` from scratch. Workaround: re-run `/react-craft:init`.
3. **No exclusion list** — If a user removes a react-craft-recommended agent, `/init` re-adds it on next run. Workaround: remove after init. (Future: add `excluded_ce_agents` to config if this becomes a pain point.)
4. **No disable command** — CE integration can only be disabled by manually removing markers. (Future: add `--ce=disabled` flag that removes markers.)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-11-ce-integration-brainstorm.md](docs/brainstorms/2026-03-11-ce-integration-brainstorm.md) — Key decisions: config-native approach, CE-only scope, auto-detect in `/init`.

### Internal References

- `/init` command: `react-craft/commands/react-craft/init.md` (Steps 2a-2h for detection pattern, Step 4 for CLAUDE.md marker pattern)
- README compatibility table: `react-craft/README.md:127-134`
- Config schema: `react-craft/commands/react-craft/init.md:279-369`
- Plugin manifest: `react-craft/.claude-plugin/plugin.json`
- Installed plugins registry: `~/.claude/plugins/installed_plugins.json`

### External References

- CE plugin: `https://github.com/EveryInc/compound-engineering-plugin`
- CE `compound-engineering.local.md` format: YAML frontmatter (`review_agents`, `plan_review_agents`) + free-text markdown body
- CE `setup` skill: `plugins/compound-engineering/skills/setup/SKILL.md`

### Deepening Agents

| Agent | Key Contribution |
|-------|-----------------|
| architecture-strategist | Confirmed config-native approach; found wrong file path (P0) |
| code-simplicity-reviewer | Dropped `ce_integration` config field; collapsed phases |
| agent-native-reviewer | `--defaults` should auto-skip; need `--ce` flag; need verification |
| pattern-recognition-specialist | Step placement (2i + 4b); config naming; summary format |
| security-sentinel | 8 findings: YAML validation, marker validation, agent name sanitization |
| plugin-detection-researcher | `installed_plugins.json` is the correct detection mechanism (P0) |
| create-agent-skills | Extract to reference file; `--defaults` should auto-skip |
| agent-native-architecture | Dynamic review context; marker preservation convention |
