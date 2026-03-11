# Quality Gate Reference

Common patterns, fixes, and techniques for the Quality Gate agent.

## Common TypeScript Errors in Generated Components

### TS2339 — Property does not exist on type

Generated code often references props that were not declared in the interface.

```typescript
// Error: Property 'variant' does not exist on type 'ButtonProps'
// Fix: Add the missing property to the props interface
interface ButtonProps {
  variant?: 'primary' | 'secondary';
}
```

### TS2322 — Type is not assignable

String literals passed where a union type is expected.

```typescript
// Error: Type 'string' is not assignable to type '"sm" | "md" | "lg"'
// Fix: Type the variable explicitly or use `as const`
const size = 'md' as const;
```

### TS2345 — Argument not assignable to parameter

Common when event handler signatures don't match.

```typescript
// Error: Argument of type '(e: Event) => void' is not assignable
// Fix: Use the correct React event type
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
```

### TS7031 — Binding element implicitly has 'any' type

Destructured props without type annotations.

```typescript
// Error: Binding element 'children' implicitly has an 'any' type
// Fix: Type the destructured parameter
const Card = ({ children }: CardProps) => { ... };
```

### TS2307 — Cannot find module

Import paths that don't resolve. Common with design token imports or alias paths.

```typescript
// Error: Cannot find module '@/tokens/colors'
// Fix: Verify the path exists and matches tsconfig paths
import { colors } from '../../tokens/colors';
```

### TS6133 — Declared but never used

Generated code sometimes imports utilities or declares variables it doesn't end up using.

```typescript
// Fix: Remove the unused import/variable
// Or if it will be used later:
// @ts-expect-error [react-craft] TODO: Wire up onClick handler
```

## ESLint Rules Commonly Violated by Generated Code

### react/prop-types

Generated components may lack PropTypes when the project requires them alongside TypeScript.

**Auto-fixable:** No. Fix by adding PropTypes or disabling the rule for typed components.

### react-hooks/exhaustive-deps

Generated `useEffect` and `useMemo` hooks frequently have incomplete dependency arrays.

**Auto-fixable:** No. Requires manual review — blindly adding all dependencies can introduce infinite loops. Log this as a warning in the report.

### react/jsx-no-target-blank

Generated links with `target="_blank"` missing `rel="noopener noreferrer"`.

**Auto-fixable:** Yes via `--fix`.

### @typescript-eslint/no-unused-vars

Unused imports and variables, often leftover from generated code that was partially refactored.

**Auto-fixable:** No. Remove the unused binding manually.

### import/order

Import statements not sorted according to project conventions.

**Auto-fixable:** Yes via `--fix`.

### react/jsx-key

Missing `key` prop on elements inside `.map()` calls.

**Auto-fixable:** No. Requires choosing an appropriate key value. Flag in the report.

### jsx-a11y/* rules

Accessibility violations: missing `alt` text, non-interactive elements with handlers, missing ARIA labels. These should be caught earlier by the Accessibility Auditor, but the Quality Gate catches anything that slipped through.

**Auto-fixable:** Some (e.g., `jsx-a11y/alt-text` can suggest fixes). Most require manual intervention.

### prettier/prettier (when using eslint-plugin-prettier)

Formatting disagreements surfaced as lint errors.

**Auto-fixable:** Yes via `--fix`.

## Scoping tsc to Specific Files

### Why Scope?

Running `tsc` on an entire monorepo can take 30-60 seconds. Scoping to generated files keeps the Quality Gate fast (typically under 5 seconds).

### tsconfig.react-craft.json Pattern

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src/components/Button/**/*"]
}
```

Key points:
- Always extend the project's own `tsconfig.json` so path aliases, strict mode settings, and compiler options are preserved.
- Set `noEmit: true` to skip output — we only care about type errors.
- Use `--incremental` on the command line for repeat runs.
- The `include` glob should match exactly the generated component directory.

### When the Project Uses Project References

If `tsconfig.json` uses `references`, the scoped config should still work because `extends` inherits `compilerOptions` but not `references`. If type errors appear from missing referenced project types, add those project output directories to the `include` or `typeRoots` of the scoped config.

### Handling Path Aliases

If the project defines `paths` in `tsconfig.json` (e.g., `@/*` mapping to `src/*`), these are inherited via `extends`. No extra configuration needed. If the scoped config changes `baseUrl`, the paths will break — avoid overriding `baseUrl`.

## @ts-expect-error vs @ts-ignore

Always use `@ts-expect-error`, never `@ts-ignore`.

### Why

- `@ts-expect-error` causes a compiler error if the suppressed error is later fixed. This means deferred issues surface automatically when the underlying problem is resolved.
- `@ts-ignore` silently suppresses forever, even after the error no longer exists. This hides stale suppressions.

### Format for react-craft Deferred Errors

```typescript
// @ts-expect-error [react-craft] TODO: Property 'variant' not in DesignSystem types — needs upstream type update
<Component variant={variant} />
```

The `[react-craft]` tag makes it easy to find and audit all deferred errors:
```bash
grep -r "@ts-expect-error \[react-craft\]" src/
```

### When to Defer vs Fail

- **Defer** when the type error is caused by external type definitions that the generator cannot control (e.g., outdated library types, missing design system type exports).
- **Fail** when the type error is caused by incorrect generated code that should be fixed by the Code Writer agent.

## Common Linting Auto-Fix Patterns

These are safe to apply automatically without human review:

| Rule | Fix Applied |
|------|-------------|
| `import/order` | Reorders imports to match project convention |
| `prettier/prettier` | Reformats code to match Prettier config |
| `react/jsx-no-target-blank` | Adds `rel="noopener noreferrer"` |
| `semi` | Adds or removes semicolons |
| `quotes` | Switches quote style |
| `comma-dangle` | Adds or removes trailing commas |
| `no-trailing-spaces` | Removes trailing whitespace |
| `eol-last` | Adds final newline |
| `@typescript-eslint/consistent-type-imports` | Converts to `import type` |

These require caution and should be logged even when auto-fixed:

| Rule | Risk |
|------|------|
| `react-hooks/exhaustive-deps` | Can introduce infinite render loops |
| `@typescript-eslint/no-floating-promises` | Adding `await` changes control flow |
| `no-unused-expressions` | Removing code may break side effects |

## Baseline Error Count Comparison

### Purpose

Projects may have pre-existing type errors or lint violations. The Quality Gate should only report errors introduced by the generated code, not pre-existing ones.

### Technique

1. **Before generation:** Run `tsc` and `lint` on the target directory and record error counts and signatures.
   ```bash
   npx tsc --project tsconfig.json --noEmit 2>&1 | tail -1 > .react-craft-baseline-ts
   npx eslint src/components/ --format json > .react-craft-baseline-lint.json
   ```

2. **After generation:** Run the same commands and compare.

3. **Diff logic:**
   - New errors not in baseline = reported as FAIL
   - Errors present in baseline = ignored
   - Errors fixed by generated code = noted as improvements

### Error Signature Matching

Match errors by file path + line content + error code, not by line number (since generated code shifts line numbers).

```
// Signature format: <error-code>:<file-relative-path>:<error-message-hash>
// Example: TS2339:Button/Button.tsx:a1b2c3d4
```

### Storing the Baseline

The baseline is ephemeral — created at the start of a build run and discarded after. It is not committed to the repository. Store it as `.react-craft-baseline-*` files in the project root and clean up in Step 7.
