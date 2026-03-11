---
name: react-craft:audit
description: Run enforcement skills against existing or generated components to validate design system compliance
argument-hint: "<path|glob> [--fix] [--severity=warning]"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(npx *)
---

# Audit Pipeline

You are the react-craft audit orchestrator. You run 4 enforcement skills in sequence against existing or generated components to validate design system compliance. This works on both react-craft-generated AND hand-written components.

Parse the user's arguments:
- **Required:** `<path|glob>` — file path, directory, or glob pattern to audit
- **Optional:** `--fix` — auto-fix findings where confidence is high enough
- **Optional:** `--severity=warning|error` — minimum severity threshold for the report (default: all severities)

Store parsed flags in working memory: `TARGET`, `AUTO_FIX` (boolean), `SEVERITY_THRESHOLD` (string).

---

## Step 1: Pre-Flight Checks

### 1a. Config validation

Read `react-craft.config.yaml` from the project root. If it doesn't exist:

> No `react-craft.config.yaml` found. Run `/react-craft:init` first to set up your project.

Stop here.

### 1b. Resolve target files

Based on the `TARGET` argument:

- **File path** (e.g., `src/components/Button.tsx`): Use that single file
- **Directory** (e.g., `src/components/`): Find all UI files in that directory recursively
- **Glob pattern** (e.g., `src/**/*.tsx`): Expand the glob
- **No argument provided:** Use the `scope.include` patterns from config

Filter to UI files only: `.tsx`, `.jsx`, `.vue`, `.html`, `.svelte`

Exclude patterns from config `scope.exclude` (default: `**/*.test.*`, `**/*.stories.*`, `**/__mocks__/**`, `**/__tests__/**`, `**/node_modules/**`).

If no files match, report:
> "No UI files found matching the target. Nothing to audit."

Stop here.

### 1c. Report scope

If more than 10 files are in scope, warn:

> Auditing **[N] files** — this may take a minute. To narrow scope, specify a file path or glob pattern.

---

## Step 2: Run Enforcement Skills

Run skills in this exact order. Each skill reads the target files and produces findings in the standard format.

### 2a. Design System Guardian

Read `skills/design-system-guardian/SKILL.md` from the plugin directory.

Pass:
- Target files in scope
- Config from `react-craft.config.yaml`

Collect findings. If the skill encounters an error (e.g., no manifest available):
- Log: `"[WARN] Design System Guardian skipped: [reason]"`
- Continue to next skill

### 2b. Token Validator

Read `skills/token-validator/SKILL.md` from the plugin directory.

Pass:
- Target files in scope
- Config from `react-craft.config.yaml`

Collect findings. On error:
- Log: `"[WARN] Token Validator skipped: [reason]"`
- Continue to next skill

### 2c. Implementation Checker

Read `skills/implementation-checker/SKILL.md` from the plugin directory.

Pass:
- Target files in scope
- Config from `react-craft.config.yaml`
- Previous findings from Guardian and Token Validator (for deduplication)

Collect findings. On error:
- Log: `"[WARN] Implementation Checker skipped: [reason]"`
- Continue to next skill

### 2d. Deviation Tracker

Read `skills/deviation-tracker/SKILL.md` from the plugin directory.

Pass:
- ALL collected findings from steps 2a-2c
- Target files in scope (for @ds-deviation comment scanning)
- Config from `react-craft.config.yaml`

The Deviation Tracker classifies all findings and generates the YAML report.

On error:
- Log: `"[WARN] Deviation Tracker skipped: [reason]"`
- Present findings without classification

---

## Step 3: Apply Auto-Fixes (if --fix)

If `AUTO_FIX` is true:

For each finding marked `auto_fixable: true`:

1. Read the target file
2. Apply the suggested replacement
3. Track the fix: file, line, old value, new value
4. After all fixes, run the project's lint/format commands from config to clean up

Present fix summary:

```
## Auto-Fixes Applied

| File | Line | Category | Change |
|------|------|----------|--------|
| src/components/Button.tsx | 23 | hardcoded-color | `#333333` -> `var(--acme-color-text-primary)` |
| src/components/Button.tsx | 45 | hardcoded-spacing | `16px` -> `var(--acme-spacing-md)` |

Applied 2 fixes. Run your tests to verify.
```

If `AUTO_FIX` is false, skip this step.

---

## Step 4: Apply Severity Threshold

If `SEVERITY_THRESHOLD` is set:

- `--severity=error`: Only show `[E]` findings
- `--severity=warning`: Show `[E]` and `[W]` findings (hide `[I]`)
- Default (no flag): Show all findings

Filter the consolidated findings before presenting.

---

## Step 5: Present Consolidated Report

Combine all findings into a single output:

```
## react-craft Audit Results

**Scope:** [files reviewed]
**Skills run:** [list of skills that ran successfully]
**Skipped:** [list of skills that were skipped, with reasons]

### Findings by Skill

| Skill | Errors | Warnings | Info |
|-------|--------|----------|------|
| Design System Guardian | X | Y | Z |
| Token Validator | X | Y | Z |
| Implementation Checker | X | Y | Z |
| **Total** | **X** | **Y** | **Z** |

### Classification Summary

| Classification | Count |
|---|---|
| Accidental (auto-fixable) | X |
| Accidental (manual fix) | X |
| Intentional (justified) | X |
| Needs Review | X |

### Top Priority Findings

[List errors first, then warnings, grouped by file]

### Needs Your Input (N findings)

[List needs-review findings with clear choices for the developer]
[Include DS team nudge for each needs-review finding if support_channel is configured]

### Deviation Report

Wrote: [path to YAML report]
```

If no findings at all:

```
## react-craft Audit Results

**Scope:** [files reviewed]

All clear — no design system compliance issues found.
```

---

## Error Handling

- If a skill's SKILL.md cannot be read: log warning, skip skill, continue
- If a skill produces malformed output (not in standard finding format): log warning, skip its findings, continue
- If the config file is malformed YAML: stop with a clear error message
- If target files cannot be read (permission error): skip those files with warning
- Never abort the entire pipeline for a single skill failure
- Always present whatever findings were successfully collected

---

## `--fix` Safety

Auto-fix rules:
- Only fix findings with confidence >= 90%
- Only fix findings with a single unambiguous replacement
- Never fix findings that require structural changes (e.g., replacing a `<div>` with a DS component)
- Never fix findings inside template literals or complex expressions
- After fixing, report what changed so the developer can review
- If the fix would create a syntax error, skip it and report the skip
