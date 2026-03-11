# Expected Findings for Material Text Field

This file documents what each enforcement skill in the react-craft audit pipeline should detect when analyzing a generated Material Design 3 Text Field component.

## Design System Guardian

| Severity | Category | Description | Classification |
|----------|----------|-------------|----------------|
| Info | component-matches-spec | TextField component matches the Material Design 3 Text Field spec | N/A |

No deviations expected for a well-generated text field.

## Token Validator

Expected findings depend on whether the generated code uses M3 tokens or hardcoded values:

| Severity | Category | Value | Token Match | Expected Behavior |
|----------|----------|-------|-------------|-------------------|
| Error | hardcoded-color | `#6750A4` | `--md-sys-color-primary` | Should use token for focus border |
| Error | hardcoded-color | `#1C1B1F` | `--md-sys-color-on-surface` | Should use token for input text |
| Error | hardcoded-color | `#B3261E` | `--md-sys-color-error` | Should use token for error state |
| Error | hardcoded-color | `#49454F` | `--md-sys-color-on-surface-variant` | Should use token for label/helper |
| Error | hardcoded-color | `#E7E0EC` | `--md-sys-color-surface-variant` | Should use token for filled background |
| Error | hardcoded-color | `#79747E` | `--md-sys-color-outline` | Should use token for outlined border |
| Warning | hardcoded-spacing | `16px` | `--md-sys-spacing-md` | Should use token for horizontal padding |
| Warning | hardcoded-spacing | `8px` | `--md-sys-spacing-sm` | Should use token for vertical padding |
| Warning | hardcoded-spacing | `4px` | `--md-sys-spacing-xs` | Should use token for gap |
| Warning | hardcoded-typography | `16px`, `400`, `Roboto` | `--md-sys-typescale-body-large` | Should use token for input text |
| Warning | hardcoded-typography | `12px`, `400` | `--md-sys-typescale-body-small` | Should use token for floating label |

A well-generated component should have ZERO token findings.

## Implementation Checker

| Severity | Category | Description |
|----------|----------|-------------|
| Error | missing-label-association | If `<label>` is not associated with `<input>` via `htmlFor`/`id` |
| Error | missing-error-announcement | If error state does not use `aria-describedby` linked to error message |
| Error | missing-required-indicator | If required field does not set `aria-required="true"` |
| Warning | missing-focus-visible | If focus styles are removed without replacement |
| Warning | missing-aria-invalid | If error state does not set `aria-invalid="true"` on the input |
| Warning | missing-character-counter-live | If character counter exists but is not in an `aria-live` region |
| Warning | label-animation-accessibility | If label animation causes content shift without `prefers-reduced-motion` support |
| Info | missing-autofill-styles | If the component does not handle browser autofill styling (`:autofill` pseudo-class) |

## Deviation Tracker Classifications

| Finding | Classification | Reason |
|---------|---------------|--------|
| Token: any hardcoded color | Accidental | Clear token match available in spec |
| Token: any hardcoded spacing/typography | Accidental | Token values provided in spec |
| Impl: missing label association | Accidental | Critical a11y requirement |
| Impl: missing error announcement | Accidental | Critical a11y requirement |
| Impl: missing character counter live | Needs Review | May be intentionally omitted if no maxLength set |
| Impl: missing autofill styles | Needs Review | Browser-specific, may be intentionally deferred |
| Impl: label animation accessibility | Needs Review | May use CSS-only approach that handles this |

## Summary

For a well-generated Material Text Field:

| Skill | Errors | Warnings | Info |
|-------|--------|----------|------|
| Guardian | 0 | 0 | 1 |
| Token Validator | 0 | 0 | 0 |
| Implementation Checker | 0 | 0 | 1 |
| **Total** | **0** | **0** | **2** |

For a poorly-generated Material Text Field (hardcoded values, missing a11y):

| Skill | Errors | Warnings | Info |
|-------|--------|----------|------|
| Guardian | 0 | 0 | 1 |
| Token Validator | 6 | 5 | 0 |
| Implementation Checker | 3 | 4 | 1 |
| **Total** | **9** | **9** | **2** |
