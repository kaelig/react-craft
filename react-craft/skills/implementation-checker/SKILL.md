---
name: implementation-checker
description: Checks UI components for missing accessibility attributes, keyboard navigation, focus management, loading/error/empty states, and other implementation concerns that Figma designs typically omit. Static pattern matching only — complements (does not duplicate) eslint-plugin-jsx-a11y.
user-invocable: false
version: 1.0.0
allowed-tools: Read, Glob, Grep
---

# Implementation Checker

You check UI components for missing implementation concerns that Figma designs typically don't capture: accessibility, keyboard navigation, state handling, and responsive behavior. You use **static pattern matching only** — you read source files and look for the presence or absence of specific patterns.

## Quick Start

1. **Read the target component(s)**
2. **Analyze for missing concerns** across categories
3. **Output findings** with severity based on context

## Instructions

### What This Skill Checks (And What It Doesn't)

**This skill checks for SEMANTIC and BEHAVIORAL completeness (static pattern matching):**
- Does the code include `onKeyDown` handlers for interactive elements?
- Does a `@media (prefers-reduced-motion)` rule exist for animated elements?
- Is there a `:focus-visible` style for interactive elements?
- Are colors hardcoded instead of using tokens? (Complements Token Validator by checking for missing `prefers-color-scheme` and contrast patterns)
- Does the modal code include focus trap logic?
- Does the component handle loading, empty, and error states?

**This skill does NOT check for SYNTACTIC issues (ESLint handles those):**
- Missing `alt` on `<img>` -> eslint-plugin-jsx-a11y covers this
- `<div onClick>` without `role` -> eslint-plugin-jsx-a11y covers this
- Missing `htmlFor` on `<label>` -> eslint-plugin-jsx-a11y covers this

### Analysis Categories

#### Category 1: Missing ARIA Attributes

Check for interactive patterns that need ARIA but don't have it:

| Pattern | Required ARIA | What to Check |
|---|---|---|
| Custom dropdown/select | `role="listbox"`, `aria-expanded`, `aria-haspopup` | Look for open/close state + list rendering |
| Tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` | Look for tab switching logic |
| Accordion | `aria-expanded`, `aria-controls` | Look for expand/collapse state |
| Live updates | `aria-live="polite"` or `role="status"` | Look for dynamic content updates |

**Severity:** Warning for missing ARIA on custom widgets.

#### Category 2: Missing prefers-reduced-motion

Check for animations and transitions that don't respect motion preferences:

| Pattern | What to Check |
|---|---|
| CSS `transition` or `animation` property | Corresponding `@media (prefers-reduced-motion: reduce)` rule |
| `framer-motion` / `react-spring` usage | `useReducedMotion()` hook or `reducedMotion` prop |
| `style` objects with `transition` | Conditional based on motion preference |

**Severity:** Warning. WCAG 2.3.3 requirement.

#### Category 3: Missing focus-visible

Check interactive elements for visible focus indicators:

| Pattern | What to Check |
|---|---|
| Custom styled buttons/links | `:focus-visible` style or `&:focus-visible` |
| Interactive `<div>` elements | Focus styling defined |
| Form inputs with custom styling | Focus state not removed (`outline: none` without replacement) |

Look specifically for the **anti-pattern** of `outline: none` or `outline: 0` without a replacement focus style.

**Severity:** Error for `outline: none` without replacement. Warning for missing `:focus-visible`.

#### Category 4: Hardcoded Colors and Spacing

Static checks that complement the Token Validator:

| Pattern | What to Check |
|---|---|
| Inline `style` objects with hex colors | Should use token variables |
| Inline `style` objects with px spacing | Should use token variables |
| Missing `prefers-color-scheme` | If component uses color tokens, does it support dark mode? |

**Note:** This is a lightweight check. The Token Validator does the thorough analysis. This category catches patterns the Token Validator might miss because they're in non-style contexts (e.g., conditional class logic).

**Severity:** Info (defer to Token Validator for full analysis).

#### Category 5: Keyboard Interaction

Check interactive elements for keyboard handlers:

| Element Type | Required Keyboard Behavior | What to Check |
|---|---|---|
| Buttons, links | Enter/Space to activate | `onClick` should also work with `onKeyDown` Enter/Space, or use `<button>` element |
| Dropdowns, menus | Arrow keys to navigate, Escape to close | `onKeyDown` handler with Arrow/Escape handling |
| Modals, dialogs | Escape to close, Tab trapped inside | `onKeyDown` Escape handler + focus trap logic |
| Tabs, tab panels | Arrow keys to switch tabs | `onKeyDown` with ArrowLeft/ArrowRight |
| Lists with selection | Arrow keys to move, Enter to select | `onKeyDown` handler on list items |

**Severity:** Error for interactive elements without keyboard support. Info for enhancements.

#### Category 6: Focus Management

| Scenario | Expected Behavior | What to Check |
|---|---|---|
| Modal opens | Focus moves to modal (first focusable element) | Focus trap implementation, `autoFocus` or `ref.focus()` |
| Modal closes | Focus returns to trigger element | Ref to trigger + `focus()` on close |
| Dropdown opens | Focus moves to first option | Focus management in open handler |
| Item deleted from list | Focus moves to next item or container | Focus logic after state change |

**Severity:** Error for modals/dialogs without focus trap. Warning for other scenarios.

#### Category 7: State Completeness

For each component, check if these states are handled:

| State | What to Look For | When Required |
|---|---|---|
| **Loading** | Skeleton, spinner, or loading indicator | Any component that fetches data |
| **Empty** | Empty state message with guidance | Any list, table, or data display |
| **Error** | Error message with retry option | Any component that fetches data or submits |

**How to detect data-fetching components:** Look for `useEffect`, `useSWR`, `useQuery`, `fetch`, `axios`, `async` patterns. If present, loading/error/empty states are likely needed.

**Severity:** Warning for missing loading/error states. Info for missing empty states.

#### Category 8: Form Composition

| Concern | What to Check |
|---|---|
| Label association | Every input has a visible `<label>` with `htmlFor` (or uses DS component with `label` prop) |
| Error association | Error messages linked via `aria-describedby` or DS component's `error` prop |
| Required fields | `required` attribute or `aria-required` + visual indicator |

**Severity:** Error for missing labels. Warning for missing error association.

## Output Format

```
## Implementation Checker Results

### src/components/TaxCategoryPicker.tsx

[E] line 38 — no-keyboard-handler
  Category: Keyboard Interaction
  <div onClick={handleSelect}> acts as a button but has no keyboard handler.
  Fix: Use <button> element, or add onKeyDown handler for Enter/Space.

[W] line 12 — missing-prefers-reduced-motion
  Category: Motion
  CSS transition on line 12 has no `prefers-reduced-motion` media query.
  Fix: Add `@media (prefers-reduced-motion: reduce) { transition: none; }`.

[W] line 1 — missing-loading-state
  Category: State Completeness
  Component fetches data (useQuery on line 12) but has no loading state.
  Fix: Add loading UI while data is being fetched.

### Summary
- 1 error (keyboard), 2 warnings (motion, states), 0 info
```

## Guidelines

- Focus on concerns that Figma designs miss and linters can't catch
- Don't duplicate what eslint-plugin-jsx-a11y already checks
- Static pattern matching ONLY — read source, look for presence/absence of patterns
- Be specific about WHAT is missing and HOW to fix it
- Reference DS components in fix suggestions when applicable
- Adjust severity based on the component's interactive nature
