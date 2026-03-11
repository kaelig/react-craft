# Implementation Checker Reference

Detailed patterns and heuristics for static analysis of implementation completeness.

## Static Pattern Matching Rules

This skill operates exclusively through static pattern matching — reading source files and checking for the presence or absence of specific code patterns. It does NOT execute code, run tests, or render components.

### Pattern: Interactive Element Without Keyboard

**Detection:**
1. Find elements with `onClick` handlers
2. Check if the element is a native interactive element (`<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`)
3. If NOT a native interactive element, check for `onKeyDown` or `onKeyPress` handler
4. Also check if the element has `role="button"` or similar

**False positive prevention:**
- If the element delegates to a DS component that handles keyboard internally, skip
- If the parent component is a DS component wrapper, skip
- If `tabIndex` is set to `-1` (intentionally not focusable), skip

### Pattern: Focus Trap Detection

**Detection of focus trap implementation:**
Look for any of these patterns:
- Import of `focus-trap-react`, `@radix-ui/react-focus-scope`, or similar libraries
- Manual implementation: `document.querySelector` + `focusableElements` + `tabIndex` management
- `FocusTrap` or `FocusLock` component usage
- `useEffect` with `focus()` call on a ref when open state changes

**When to require:**
- Any component that renders an overlay (`position: fixed` or `position: absolute` with backdrop)
- Any component with `role="dialog"` or `role="alertdialog"`
- Any component using `<dialog>` element (note: native `<dialog>` with `showModal()` provides built-in focus trap)

### Pattern: prefers-reduced-motion Check

**Detection:**
1. Find CSS `transition`, `animation`, `transform` properties in:
   - CSS/SCSS files imported by the component
   - `style` objects in JSX
   - CSS-in-JS template literals
   - Tailwind `animate-*`, `transition-*` classes
2. Check for corresponding motion-safe patterns:
   - `@media (prefers-reduced-motion: reduce)` in CSS
   - `useReducedMotion()` or `usePrefersReducedMotion()` hook
   - `motion-reduce:` Tailwind prefix
   - `reducedMotion` prop on animation libraries

**Exemptions:**
- `opacity` transitions (generally safe for motion sensitivity)
- `color` and `background-color` transitions (not motion)
- Transitions with `duration` <= 100ms (too fast to cause issues)

### Pattern: focus-visible Check

**Detection:**
1. Find interactive elements with custom styling (not default browser styles)
2. Check for `:focus-visible` pseudo-class in associated CSS
3. Specifically flag `outline: none` or `outline: 0` without:
   - A replacement `box-shadow` on focus
   - A `:focus-visible` rule that provides an alternative indicator
   - A DS component that handles focus styling internally

### Pattern: Data Fetching Without State Handling

**Detection of data fetching:**
- `useEffect` containing `fetch(`, `axios.`, `.get(`, `.post(`
- `useSWR`, `useQuery`, `useMutation`, `useAsyncData`
- `async` function called inside `useEffect`
- `React.lazy`, `React.Suspense` (for code splitting — loading state may be handled by Suspense boundary)

**State checks:**
- **Loading:** Look for conditional rendering based on a `loading`, `isLoading`, `pending` variable, or `<Skeleton>`, `<Spinner>`, `<Loading>` components
- **Error:** Look for conditional rendering based on `error`, `isError` variable, try/catch in async flow, `.catch(` handler that updates UI state
- **Empty:** Look for `.length === 0` or `!data?.length` checks with corresponding UI

### Pattern: Missing Label Association

**Detection:**
1. Find `<input>`, `<select>`, `<textarea>` elements
2. For each, check:
   - Is there a `<label>` with `htmlFor` matching the element's `id`?
   - Is the element wrapped in a `<label>`?
   - Does the element use `aria-label` or `aria-labelledby`?
   - Is it a DS component with a `label` prop?
3. If none of the above, flag as missing label

**Exemptions:**
- Hidden inputs (`type="hidden"`)
- Inputs inside DS form components that handle labeling internally

## Context-Dependent Severity Matrix

| Finding | Simple Component | Data-Fetching Component | Modal/Dialog |
|---------|-----------------|------------------------|--------------|
| No keyboard handler | Warning | Warning | Error |
| No focus trap | N/A | N/A | Error |
| No loading state | N/A | Warning | N/A |
| No error state | N/A | Warning | N/A |
| No empty state | N/A | Info | N/A |
| Missing ARIA | Warning | Warning | Error |
| No prefers-reduced-motion | Warning | Warning | Warning |
| No focus-visible | Warning | Warning | Error |
| Missing label | Error | Error | Error |

## Deduplication with Other Skills

The Implementation Checker's findings may overlap with:

- **Token Validator:** Both detect hardcoded colors. Implementation Checker only flags hardcoded values as `info` severity and defers to Token Validator for authoritative findings.
- **Design System Guardian:** Guardian may suggest a DS component that would solve an Implementation Checker finding (e.g., using `<AcmeSelect>` instead of a custom dropdown removes the keyboard/ARIA findings). When the audit pipeline runs both, the Deviation Tracker handles deduplication.

When previous findings from other skills are available in context, skip findings that are already covered.
