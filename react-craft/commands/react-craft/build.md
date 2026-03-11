---
name: react-craft:build
description: Build a React component from a Figma design spec using the react-craft agent pipeline
argument-hint: "<figma-link> [--best-effort] [--dry-run] [--resume <ComponentName>]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(npx *), Bash(npm *), Glob, Grep, Skill
---

# Build Pipeline

You are the react-craft build orchestrator. You run a 6-agent pipeline that transforms a Figma design into a production React component with accessibility validation and Storybook stories. Follow each step in order. Do not skip steps.

Parse the user's arguments:
- **Required:** `<figma-link>` — a Figma URL (or `--resume <ComponentName>`)
- **Optional:** `--best-effort` — skip all human gates, use agent judgment for ambiguity
- **Optional:** `--dry-run` — run Design Analyst and Component Architect only (produces brief + architecture without generating code)
- **Optional:** `--resume <ComponentName>` — resume a previously failed pipeline

Store parsed flags in working memory: `FIGMA_LINK`, `BEST_EFFORT` (boolean), `DRY_RUN` (boolean), `RESUME` (boolean), `COMPONENT_NAME` (string, derived from Figma or resume arg).

---

## Step 1: Pre-Flight Checks

### 1a. Config validation

Read `react-craft.config.yaml` from the project root. If it doesn't exist:

> No `react-craft.config.yaml` found. Run `/react-craft:init` first to set up your project.

Stop here.

Validate required fields exist:
- `detection.react_version`
- `detection.styling_method`
- `output.components_dir`
- `output.docs_dir`
- `scripts.typecheck`

### 1b. Resume mode

If `--resume` is set:

1. Read `docs/react-craft/components/<ComponentName>/pipeline-state.yaml`
2. If file doesn't exist or `status` is `completed`, warn and stop
3. Find the last step with `status: failed` or `status: pending`
4. Set `RESUME_FROM` to that step name
5. Verify artifact hashes for all completed steps (see Step 5d)
6. Skip to that step in the pipeline (Step 3)

### 1c. Concurrent pipeline guard

Use the Glob tool to find `pipeline-state.yaml` files, then Read each one and check for `status: in-progress`.

If found:

> Another pipeline is in progress for **[ComponentName]**. Finish or cancel it first, or use `--resume` to continue.
> To cancel: delete `docs/react-craft/components/<ComponentName>/pipeline-state.yaml`

Stop here.

### 1d. Figma link validation

Validate the URL format:
- Accept: `figma.com/file/...`, `figma.com/design/...` with node-id parameter
- Reject: prototype links (`/proto/`), branch links (`/branch/`)

If the link lacks a `node-id` parameter, warn:

> This is a full-file link. For best results, share a node-level link (select the component in Figma, right-click → "Copy link to selection"). Continue anyway? (y/n)

In `--best-effort` mode: continue with warning logged.

### 1e. Derive component name

Extract the component name from the Figma link. Use the Figma Console MCP to fetch the node name, then sanitize:
- PascalCase: `data-table` → `DataTable`
- Validate: `^[A-Z][a-zA-Z0-9]*$`
- Reject reserved names: CON, PRN, AUX, NUL, COM1-9, LPT1-9

If name can't be derived, ask the human.

### 1f. Baseline TypeScript errors

Capture baseline error count so Quality Gate only flags NEW errors:

```bash
npx tsc --noEmit 2>&1 | tail -1
```

Store the count in working memory as `BASELINE_TSC_ERRORS`.

### 1g. Create output directories

```bash
mkdir -p docs/react-craft/components/<ComponentName>
```

### 1h. Git branch

Create a working branch for safe rollback:

```bash
git checkout -b react-craft/<ComponentName>
```

If the branch already exists (from a previous attempt), ask whether to reuse or create a new one (e.g., `react-craft/<ComponentName>-2`). In `--best-effort` mode: reuse the existing branch.

---

## Step 2: Initialize Pipeline State

Write `docs/react-craft/components/<ComponentName>/pipeline-state.yaml`:

```yaml
component: <ComponentName>
started: <ISO-8601 timestamp>
figma_link: "<FIGMA_LINK>"
best_effort: <true|false>
status: in-progress
baseline_tsc_errors: <BASELINE_TSC_ERRORS>
dry_run: <true|false>
iteration_budget: 10
iterations_used: 0
steps:
  design-analyst: { status: pending }
  component-architect: { status: pending }
  code-writer: { status: pending }
  accessibility-auditor: { status: pending }
  story-author: { status: pending }
  quality-gate: { status: pending }
artifacts: {}
```

---

## Step 3: Run Pipeline

Run agents in sequence (3a-3c), then in parallel (3d-3e), then final gate (3f). Each agent reads upstream artifacts and writes its own output. After each agent completes, update `pipeline-state.yaml`.

**Progress reporting:** Before each agent invocation, print a progress line:
```
[react-craft] (N/6) <AgentName>: <brief description of what it's doing>...
```
For example: `[react-craft] (3/6) Code Writer: generating Button.tsx...`

**Global iteration budget:** Track total agent invocations across the entire pipeline. If `iterations_used` reaches 10, halt with partial status.

**Dry-run mode:** If `DRY_RUN` is true, stop after Step 3b (Component Architect). Print:
```
[react-craft] Dry run complete. Artifacts:
  - docs/react-craft/components/<ComponentName>/brief.md
  - docs/react-craft/components/<ComponentName>/architecture.md
```
Update `pipeline-state.yaml` with `status: dry-run-complete` and return.

### 3a. Design Analyst

Invoke the `design-analyst` skill with:
- `FIGMA_LINK`
- `BEST_EFFORT` flag
- `COMPONENT_NAME`
- Output directory: `docs/react-craft/components/<ComponentName>/`

**Expected output:** `brief.md` in the output directory.

**Gate:** If `brief.md` contains any `[PENDING]` items and `--best-effort` is NOT set, stop and present the pending items to the human. Do not continue until resolved.

After completion:
1. Compute SHA-256 of `brief.md`, store in `pipeline-state.yaml` under `artifacts.brief`
2. Update step status to `completed` with timestamp
3. Increment `iterations_used`

### 3b. Component Architect

Invoke the `component-architect` skill with:
- Path to `brief.md`
- `react-craft.config.yaml` path
- `BEST_EFFORT` flag

**Before reading:** Verify SHA-256 of `brief.md` matches stored hash. Halt on mismatch.

**Expected output:** `architecture.md` in the output directory.

After completion:
1. Compute SHA-256 of `architecture.md`, store in `pipeline-state.yaml` under `artifacts.architecture`
2. Update step status to `completed` with timestamp
3. Increment `iterations_used`

### 3c. Code Writer

Invoke the `code-writer` skill with:
- Path to `brief.md` and `architecture.md`
- `react-craft.config.yaml` path
- `BEST_EFFORT` flag

**Before reading:** Verify SHA-256 of both upstream artifacts. Halt on mismatch.

**Expected output:** Component files in `<output.components_dir>/<ComponentName>/`

After completion:
1. List all generated files, compute SHA-256 of each, store in `pipeline-state.yaml`
2. Update step status to `completed` with timestamp
3. Increment `iterations_used`

### 3d. Accessibility Auditor (parallel with 3e)

Print: `[react-craft] (4/6) Accessibility Auditor: auditing <ComponentName> for WCAG compliance...`

Invoke the `accessibility-auditor` skill with:
- Generated component file paths
- Path to `brief.md` and `architecture.md`
- `react-craft.config.yaml` path
- `BEST_EFFORT` flag

**Runs in parallel with Step 3e.** Use the Skill tool to invoke both `accessibility-auditor` and `story-author` simultaneously.

**Expected output:** `a11y-report.md` in the output directory with findings categorized by severity (P1 = blocker, P2 = should fix, P3 = nice to have).

After completion:
1. Compute SHA-256 of `a11y-report.md`, store in `pipeline-state.yaml` under `artifacts.a11y-report`
2. Update step status to `completed` with timestamp
3. Increment `iterations_used`

**P1 remediation:** If `a11y-report.md` contains any P1 findings:
1. Discard Story Author output from Step 3e (if it has completed)
2. Re-invoke Code Writer with the P1 findings from `a11y-report.md`
3. After Code Writer remediation completes, re-run Accessibility Auditor to verify fixes
4. Re-run Story Author on the updated component code
5. Each re-invocation increments `iterations_used`

### 3e. Story Author (parallel with 3d)

Print: `[react-craft] (5/6) Story Author: generating stories for <ComponentName>...`

Invoke the `story-author` skill with:
- Generated component file paths
- Path to `brief.md` and `architecture.md`
- `react-craft.config.yaml` path
- `BEST_EFFORT` flag

**Runs in parallel with Step 3d.** Both agents are invoked simultaneously after Code Writer completes.

**Expected output:** Storybook story files in `<output.components_dir>/<ComponentName>/`

After completion:
1. List all generated story files, compute SHA-256 of each, store in `pipeline-state.yaml`
2. Update step status to `completed` with timestamp
3. Increment `iterations_used`

**Race condition note:** If Accessibility Auditor (3d) finds P1 issues triggering Code Writer remediation, Story Author output is discarded and stories are re-generated after remediation completes. See Step 3d for the full remediation flow.

### 3f. Quality Gate

Print: `[react-craft] (6/6) Quality Gate: running checks on <ComponentName>...`

Invoke the `quality-gate` skill with:
- Generated component file paths
- Generated story file paths (from Step 3e)
- `react-craft.config.yaml` path
- `BASELINE_TSC_ERRORS`
- `BEST_EFFORT` flag

**Expected output:** `review.md` in the output directory with PASS/FAIL per check.

**Storybook test:** If Storybook is configured in the project (detected via `scripts.storybook` in config or `devDependencies`), also run:
```bash
npx storybook test --ci
```
Include Storybook test results in `review.md`.

After completion:
1. Update step status with result
2. Increment `iterations_used`

---

## Step 4: Remediation Loop

If Quality Gate reports **FAIL**:

### 4a. Check remediation budget

- Max 3 remediation attempts
- Check global iteration budget (max 10 total)
- If either exceeded, go to Step 4c (terminal state)

### 4b. Bail on identical failures

Compare the current failure errors with the previous attempt's errors. If the error signatures are identical (same files, same line numbers, same error codes), skip remediation and go to Step 4d (terminal state).

### 4c. Re-invoke Code Writer

Pass to Code Writer:
- **Only the failure diffs** from `review.md` (not the full report)
- The specific files that need changes
- `BEST_EFFORT` flag

After Code Writer completes, re-run Quality Gate (Step 3f). Update `iterations_used`.

### 4d. Terminal state (remediation exhausted)

When remediation is exhausted (3 attempts or identical failure):

1. Leave all generated files in place — do NOT delete them
2. Update `pipeline-state.yaml`: `status: partial`
3. Add `[UNRESOLVED]` markers to `review.md` with all remaining findings
4. Present summary:

> Quality Gate failed after [N] attempts. Generated files are at:
> - `<components_dir>/<ComponentName>/`
> - `docs/react-craft/components/<ComponentName>/`
>
> Fix the issues manually, then run:
> ```
> /react-craft:build --resume <ComponentName>
> ```

5. Do NOT suggest committing broken code

---

## Step 5: Pipeline Complete

When Quality Gate reports **PASS**:

### 5a. Update pipeline state

Update `pipeline-state.yaml`:
```yaml
status: completed
completed: <ISO-8601 timestamp>
```

### 5b. Summary

Present a completion summary:

```
react-craft: <ComponentName> — BUILD COMPLETE

Files generated:
  <list of component files>
  <list of story files>

Documentation:
  docs/react-craft/components/<ComponentName>/brief.md
  docs/react-craft/components/<ComponentName>/architecture.md
  docs/react-craft/components/<ComponentName>/a11y-report.md
  docs/react-craft/components/<ComponentName>/review.md

Accessibility: <PASS|FINDINGS>
  P1 (blockers): <count>
  P2 (should fix): <count>
  P3 (nice to have): <count>

Stories: <count> stories generated
  Storybook test: <PASS|FAIL|SKIPPED>

Quality Gate: PASS
  TypeScript: ✓
  Linting: ✓
  Formatting: ✓
  Storybook: ✓ (or SKIPPED if not configured)

Enforcement: <PASS|SKIPPED>
  (shown only if enforcement.enabled is true in config)

Branch: react-craft/<ComponentName>

Next steps:
  1. Review the generated code and stories
  2. Commit and open a PR
```

### 5c. Optional Enforcement

If `enforcement.enabled: true` in `react-craft.config.yaml`, run the enforcement skills in sequence after Quality Gate passes:

1. **Design System Guardian** — invoke `design-system-guardian` skill
2. **Token Validator** — invoke `token-validator` skill
3. **Implementation Checker** — invoke `implementation-checker` skill
4. **Deviation Tracker** — invoke `deviation-tracker` skill

Each skill receives the generated component file paths and config. Results are appended to `review.md` under an `## Enforcement` section.

If any enforcement skill reports violations at `error` severity, the pipeline status is set to `partial` (same as a Quality Gate failure) and the summary includes the enforcement findings. Violations at `warning` severity are reported but do not block completion.

If `enforcement.enabled` is not set or is `false`, skip this step entirely.

### 5d. Artifact integrity check (used by resume)

For each artifact in `pipeline-state.yaml`:
1. Compute current SHA-256
2. Compare with stored hash
3. If mismatch: warn that the file was modified outside the pipeline
4. In `--best-effort` mode: continue with warning. Otherwise: ask human whether to re-run the affected step.

---

## `--best-effort` Autonomous Defaults

When `--best-effort` is set, every human gate has an autonomous default:

| Gate | Default |
|------|---------|
| Figma link lacks node-id | Continue with warning |
| Brief has `[PENDING]` items | Mark as `[ASSUMED]` with reasoning |
| Git branch already exists | Reuse existing branch |
| Artifact hash mismatch on resume | Continue with warning |
| A11y Auditor P1 findings | Attempt Code Writer remediation |
| Quality Gate FAIL (first attempt) | Attempt remediation |
| Enforcement violations (error) | Report but mark as partial |
| Concurrent pipeline detected | Warn and stop (never override — data safety) |

---

## Iteration Budget

| Counter | Limit | What counts |
|---------|-------|-------------|
| Per-agent remediation | 3 | Code Writer re-invocations for same Quality Gate failure |
| A11y remediation | 2 | Code Writer re-invocations for P1 accessibility findings |
| Global iterations | 10 | Total agent skill invocations across the entire pipeline |

When either per-agent limit is hit or the global budget is exhausted, the pipeline enters terminal state (Step 4d).
