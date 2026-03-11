# Expected Findings for TaxCategoryPicker.tsx

This file documents what each enforcement skill in the react-craft audit pipeline should detect when analyzing `TaxCategoryPicker.tsx`. Use it to verify skill behavior and as a reference for eval runs.

## Design System Guardian

| Line | Severity | Category | Description | Classification |
|------|----------|----------|-------------|----------------|
| 55 | Warning | component-alternative-available | Custom dropdown where `<AcmeSelect>` exists | Intentional (`@ds-deviation` on line 54) |
| 89 | Warning | component-alternative-available | `<input type="text">` where `<AcmeInput>` exists | Needs Review |

## Token Validator

| Line | Severity | Category | Value | Token Match | Confidence |
|------|----------|----------|-------|-------------|------------|
| 61 | Warning | hardcoded-spacing | `padding: '8px 12px'` | `--acme-spacing-sm` (8px) | 50% (12px has no exact match) |
| 62 | Error | hardcoded-color | `#ccc` | No exact match | 40% |
| 64 | Warning | hardcoded-color | `#ffffff` | `--acme-color-background-primary` | 90% |
| 65 | Error | hardcoded-color | `#333333` | `--acme-color-text-primary` | 98% |
| 66 | Warning | hardcoded-typography | `fontSize: '14px'` | `--acme-font-size-md` | 95% |
| 67 | Warning | hardcoded-typography | `fontFamily: 'Helvetica Neue'` | `--acme-font-family-sans` | 85% |
| 64 | Warning | hardcoded-border-radius | `borderRadius: '4px'` | `--acme-border-radius-sm` | 95% |
| 103 | Warning | hardcoded-typography | `fontSize: '11px'` | No exact match | 30% |
| 104 | Warning | hardcoded-typography | `fontWeight: 700` | `--acme-font-weight-bold` | 95% |
| 105 | Warning | hardcoded-color | `#666` | No exact match | 40% |
| 113 | Warning | hardcoded-color | `#e3f2fd` | No exact match | 30% |
| 114 | Error | hardcoded-color | `#333` | `--acme-color-text-primary` | 95% |
| 119 | Warning | hardcoded-color | `#999` | No exact match | 40% |

## Implementation Checker

| Line | Severity | Category | Description |
|------|----------|----------|-------------|
| 56 | Error | no-keyboard-handler | Dropdown trigger `<div onClick>` has no `onKeyDown` handler for Enter/Space |
| 56 | Error | missing-focus-management | Dropdown doesn't trap focus or manage focus on open/close |
| 56 | Warning | no-escape-to-close | Dropdown has no Escape key handler to close |
| 110 | Error | no-keyboard-handler | List items use `<div onClick>` with no keyboard navigation (Arrow keys, Enter) |
| 89 | Warning | missing-label | Search input has no associated `<label>` element |
| 1 | Warning | missing-loading-state | Component fetches data (`useEffect` + `fetch`) but has no loading UI |
| 1 | Warning | missing-error-state | Component fetches data but has no error handling UI |
| 1 | Info | missing-empty-state | Filtered list renders nothing when empty — no empty state message |
| 56 | Warning | missing-aria-attributes | Dropdown needs `role="listbox"`, `aria-expanded`, `aria-haspopup` |
| 95 | Warning | missing-focus-visible | Search input has `outline: none` with no replacement focus style |

## Deviation Tracker Classifications

| Finding | Classification | Reason |
|---------|---------------|--------|
| Guardian: custom dropdown | Intentional | `@ds-deviation` comment with reason and ticket |
| Guardian: native input | Needs Review | No deviation comment, medium confidence |
| Token: `#333333` | Accidental | Exact token match, 98% confidence |
| Token: `#ccc`, `#666`, `#999` | Needs Review | No exact token match |
| Implementation: keyboard | Accidental | Critical a11y gap |
| Implementation: loading/error | Needs Review | Developer may have intentional reasons |

## Summary

| Skill | Errors | Warnings | Info |
|-------|--------|----------|------|
| Guardian | 0 | 2 | 0 |
| Token Validator | 3 | 10 | 0 |
| Implementation Checker | 3 | 6 | 1 |
| **Total** | **6** | **18** | **1** |
