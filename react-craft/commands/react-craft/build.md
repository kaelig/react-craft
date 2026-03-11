---
name: react-craft:build
description: Build a React component from a Figma design spec using the react-craft agent pipeline
argument-hint: "<figma-link> [--best-effort] [--resume <ComponentName>]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent
---

# Build Pipeline

You are the react-craft build orchestrator. You run a 4-agent pipeline that transforms a Figma design into a production React component. Follow each step in order. Do not skip steps.

Parse the user's arguments:
- **Required:** `<figma-link>` — a Figma URL (or `--resume <ComponentName>`)
- **Optional:** `--best-effort` — skip all human gates, use agent judgment for ambiguity
- **Optional:** `--resume <ComponentName>` — resume a previously failed pipeline

Store parsed flags in working memory: `FIGMA_LINK`, `BEST_EFFORT` (boolean), `RESUME` (boolean), `COMPONENT_NAME` (string, derived from Figma or resume arg).

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
5. Verify artifact hashes for all completed steps (see Step 5c)
6. Skip to that step in the pipeline (Step 3)

### 1c. Concurrent pipeline guard

Check for any `pipeline-state.yaml` files with `status: in-progress`:

```bash
grep -rl 'status: in-progress' docs/react-craft/components/*/pipeline-state.yaml 2>/dev/null
```

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
iteration_budget: 6
iterations_used: 0
steps:
  design-analyst: { status: pending }
  component-architect: { status: pending }
  code-writer: { status: pending }
  quality-gate: { status: pending }
artifacts: {}
```

---

## Step 3: Run Pipeline

Run agents in sequence. Each agent reads upstream artifacts and writes its own output. After each agent completes, update `pipeline-state.yaml`.

**Global iteration budget:** Track total agent invocations across the entire pipeline. If `iterations_used` reaches 6, halt with partial status.

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

### 3d. Quality Gate

Invoke the `quality-gate` skill with:
- Generated component file paths
- `react-craft.config.yaml` path
- `BASELINE_TSC_ERRORS`
- `BEST_EFFORT` flag

**Expected output:** `review.md` in the output directory with PASS/FAIL per check.

After completion:
1. Update step status with result
2. Increment `iterations_used`

---

## Step 4: Remediation Loop

If Quality Gate reports **FAIL**:

### 4a. Check remediation budget

- Max 3 remediation attempts
- Check global iteration budget (max 6 total)
- If either exceeded, go to Step 4c (terminal state)

### 4b. Bail on identical failures

Compare the current failure errors with the previous attempt's errors. If the error signatures are identical (same files, same line numbers, same error codes), skip remediation and go to Step 4c.

### 4c. Re-invoke Code Writer

Pass to Code Writer:
- **Only the failure diffs** from `review.md` (not the full report)
- The specific files that need changes
- `BEST_EFFORT` flag

After Code Writer completes, re-run Quality Gate (Step 3d). Update `iterations_used`.

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

Documentation:
  docs/react-craft/components/<ComponentName>/brief.md
  docs/react-craft/components/<ComponentName>/architecture.md
  docs/react-craft/components/<ComponentName>/review.md

Quality Gate: PASS
  TypeScript: ✓
  Linting: ✓
  Formatting: ✓

Branch: react-craft/<ComponentName>

Next steps:
  1. Review the generated code
  2. Add Storybook stories (v0.2 will automate this)
  3. Commit and open a PR
```

### 5c. Artifact integrity check (used by resume)

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
| Quality Gate FAIL (first attempt) | Attempt remediation |
| Concurrent pipeline detected | Warn and stop (never override — data safety) |

---

## Iteration Budget

| Counter | Limit | What counts |
|---------|-------|-------------|
| Per-agent remediation | 3 | Code Writer re-invocations for same Quality Gate failure |
| Global iterations | 6 | Total agent skill invocations across the entire pipeline |

When either limit is hit, the pipeline enters terminal state (Step 4d).
