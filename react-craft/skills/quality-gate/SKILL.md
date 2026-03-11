---
name: quality-gate
description: Runs TypeScript compilation, linting, and formatting checks on generated components. Final mechanical validation before a component is ready for review. Use as the last step in the react-craft build pipeline.
user-invocable: false
---

# Quality Gate

You are the final mechanical check. You run the project's own toolchain against the generated component files and report PASS/FAIL for each check.

## Quick Start

Given generated component files + `react-craft.config.yaml`, run all quality checks and produce a `review.md` report.

## Instructions

### Step 1: Read Config

Read `react-craft.config.yaml` for:
- `scripts.typecheck` — the TypeScript check command
- `scripts.lint` — the lint command
- `scripts.format` — the format command
- `output.components_dir` — where generated files live

### Step 2: Create Scoped tsconfig

Create a temporary `tsconfig.react-craft.json` extending the user's config:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["<output.components_dir>/<ComponentName>/**/*"]
}
```
This scopes type-checking to generated files only (saves 30s+ on large projects).

### Step 3: Run Checks

Run each check and capture output:

1. **TypeScript Compilation**
   ```bash
   npx tsc --project tsconfig.react-craft.json --incremental
   ```
   Only flag NEW errors (compare against baseline if available).

2. **Linting**
   ```bash
   <scripts.lint> <generated-files>
   ```
   Attempt auto-fix first: `<scripts.lint> --fix <generated-files>`

3. **Formatting**
   ```bash
   <scripts.format> --check <generated-files>
   ```
   Attempt auto-fix first: `<scripts.format> --write <generated-files>`

### Step 4: Three-Path Failure Handling

For each failure:

| Path | When | Action |
|------|------|--------|
| **Fix** | Auto-fixable (lint --fix, format --write) | Apply fix automatically |
| **Defer** | Not auto-fixable but non-blocking | Add `// @ts-expect-error [react-craft] TODO: <explanation>` |
| **Accept** | Non-blocking warnings only | Log in review.md, do not modify code |

Rules:
- Type errors NEVER get Accept — they break builds
- In `--best-effort` mode: attempt Fix first, then Defer all remaining
- Never Accept silently

### Step 5: Bail on Identical Failures

If attempt N fails with the same error signature as attempt N-1, halt immediately. Don't burn tokens repeating the same fix.

### Step 6: Write Report

Write `docs/react-craft/components/<ComponentName>/review.md`:

```markdown
# Quality Gate Report — <ComponentName>

## Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | PASS/FAIL | [error count, specific errors] |
| Linting | PASS/FAIL | [rule violations] |
| Formatting | PASS/FAIL | [files reformatted] |

## Overall: PASS / FAIL / PARTIAL

## Actions Taken
- [Auto-fixed: lint rule X in file Y]
- [Deferred: type error Z with TODO comment]

## Unresolved Issues
- [Issue 1: description, file, line]
```

### Step 7: Clean Up

Remove `tsconfig.react-craft.json` after checks complete.

## Examples

### PASS Report
```markdown
| TypeScript | PASS | 0 errors |
| Linting | PASS | 0 violations (2 auto-fixed) |
| Formatting | PASS | 1 file reformatted |

Overall: PASS
```

### FAIL Report
```markdown
| TypeScript | FAIL | 2 errors |
| Linting | PASS | 0 violations |
| Formatting | PASS | 0 files changed |

Overall: FAIL

## Unresolved Issues
- Type error: Property 'variant' does not exist on type 'ButtonProps'. (Button.tsx:42)
- Type error: Type 'string' is not assignable to type '"primary" | "secondary"'. (Button.tsx:15)
```

See `reference.md` for common quality patterns.
