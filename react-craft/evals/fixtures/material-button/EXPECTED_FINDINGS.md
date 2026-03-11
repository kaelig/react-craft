# Expected Findings for Material Button

This file documents what each enforcement skill in the react-craft audit pipeline should detect when analyzing a generated Material Design 3 Button component. Use it to verify skill behavior and as a reference for eval runs.

## Design System Guardian

| Severity | Category | Description | Classification |
|----------|----------|-------------|----------------|
| Info | component-matches-spec | Button component matches the Material Design 3 Button spec | N/A |

The Guardian should confirm the generated component aligns with the M3 Button spec. No deviations are expected for a well-generated button.

## Token Validator

Expected findings depend on whether the generated code uses M3 tokens or hardcoded values:

| Severity | Category | Value | Token Match | Expected Behavior |
|----------|----------|-------|-------------|-------------------|
| Error | hardcoded-color | Any hex color (e.g., `#6750A4`) | `--md-sys-color-primary` | Should use token, not hex |
| Error | hardcoded-color | `#FFFFFF` | `--md-sys-color-on-primary` | Should use token |
| Error | hardcoded-color | `#79747E` | `--md-sys-color-outline` | Should use token |
| Warning | hardcoded-spacing | `24px` | `--md-sys-spacing-md` | Should use token |
| Warning | hardcoded-spacing | `16px` | `--md-sys-spacing-sm` | Should use token |
| Warning | hardcoded-spacing | `8px` | `--md-sys-spacing-xs` | Should use token |
| Warning | hardcoded-typography | `14px`, `500`, `Roboto` | `--md-sys-typescale-label-large` | Should use token |
| Warning | hardcoded-elevation | Box shadow values | `--md-sys-elevation-level1` | Should use token |

A well-generated component should have ZERO token findings -- all values should reference M3 tokens. Token findings indicate the Code Writer failed to use the spec's token definitions.

## Implementation Checker

| Severity | Category | Description |
|----------|----------|-------------|
| Error | missing-semantic-element | If button renders as `<div>` instead of `<button>` element |
| Error | no-keyboard-handler | If Enter/Space activation is not handled (native `<button>` gets this for free) |
| Warning | missing-disabled-state | If disabled prop does not set `aria-disabled` or `disabled` attribute |
| Warning | missing-focus-visible | If focus styles are removed without replacement |
| Info | missing-ripple-animation | If ripple/press animation is not implemented (nice to have) |

A well-generated component using a native `<button>` element should have minimal implementation findings, since the browser provides keyboard activation and focus management natively.

## Deviation Tracker Classifications

| Finding | Classification | Reason |
|---------|---------------|--------|
| Token: any hardcoded color | Accidental | Clear token match available in spec |
| Token: any hardcoded spacing | Accidental | Token values provided in spec |
| Impl: div instead of button | Accidental | Spec anatomy clearly indicates `<button>` element |
| Impl: missing disabled state | Accidental | Disabled state explicitly defined in spec |
| Impl: missing ripple | Needs Review | Animation implementation may be intentionally deferred |

## Summary

For a well-generated Material Button:

| Skill | Errors | Warnings | Info |
|-------|--------|----------|------|
| Guardian | 0 | 0 | 1 |
| Token Validator | 0 | 0 | 0 |
| Implementation Checker | 0 | 0 | 1 |
| **Total** | **0** | **0** | **2** |

For a poorly-generated Material Button (hardcoded values, div instead of button):

| Skill | Errors | Warnings | Info |
|-------|--------|----------|------|
| Guardian | 0 | 0 | 1 |
| Token Validator | 3 | 5 | 0 |
| Implementation Checker | 2 | 2 | 1 |
| **Total** | **5** | **7** | **2** |
