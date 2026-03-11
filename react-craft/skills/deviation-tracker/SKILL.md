---
name: deviation-tracker
description: Classifies design system findings as accidental, intentional, or needs-review. Generates structured YAML deviation reports for the design system team. Parses @ds-deviation inline comments for justifications.
user-invocable: false
allowed-tools: Read, Write, Glob, Grep
---

# Deviation Tracker

You classify design system findings and generate structured YAML reports for the design system team.

## Quick Start

1. **Collect findings** from Guardian, Token Validator, and Implementation Checker
2. **Classify each finding** as accidental, intentional, or needs-review
3. **Generate YAML report** to configured path
4. **Present summary** to developer

## Instructions

### Step 1: Collect Findings

This skill typically runs after the other three skills. It consumes their findings in the standard format:

```
[SEVERITY] file:line — category
  Description
  Suggestion: ...
  Confidence: ...
```

If running standalone, read findings from the conversation context.

### Step 2: Classify Each Finding

Read `react-craft.config.yaml` for classification settings. Use these rules based on the `classification_mode` in config:

#### Mode: `assisted` (default)

**Auto-classify as `accidental`:**
- Token Validator finding with confidence > 90% and a single unambiguous match
- Guardian finding where native HTML element is used and DS component has same role (confidence > 85%)
- Implementation Checker finding for missing ARIA attribute that the DS equivalent provides automatically

**Auto-classify as `intentional`:**
- A `@ds-deviation` comment exists on or near the finding's line with a `reason`
- The component is listed in the config `allowlist`

**Mark as `needs-review`:**
- Everything else, including:
  - Guardian findings with medium confidence (60-85%)
  - Token Validator findings with approximate matches
  - Multiple possible DS alternatives
  - Custom component that wraps/extends a DS component

**DS team nudge for `needs-review` findings:**

Read `design_system.support_channel` and `design_system.support_label` from `react-craft.config.yaml`. For each `needs-review` finding, include this nudge in the output:

> Not sure if this is intentional? Check with the DS team: {support_label} ({support_channel})

Example:
> Not sure if this is intentional? Check with the DS team: Design System Team (#design-system)

If `support_channel` is not configured, omit the nudge.

#### Mode: `auto`
Same as `assisted` but with lower thresholds — more aggressive auto-classification.

#### Mode: `manual`
All findings marked as `needs-review` — developer classifies everything.

### Step 3: Parse @ds-deviation Comments

Scan the source files around each finding for `@ds-deviation` comments:

```tsx
// @ds-deviation reason="the design system's Select doesn't support grouped options"
// @ds-deviation ticket="DS-1234"
// @ds-deviation approved-by="@design-system-team"
```

**Recognized keys:**
- `reason` — Why the deviation exists (required for `intentional` classification)
- `ticket` — Link to design system team ticket for tracking
- `approved-by` — Who approved this deviation
- `expires` — When this deviation should be revisited (e.g., "2026-Q3")

A comment is associated with a finding if it's within 3 lines above the finding's line.

### Step 4: Generate YAML Report

Write a report to the configured `report_path` (default: `docs/react-craft/deviations/`).

**Filename format:** `{date}-{project-or-scope}.yaml`
Example: `2026-03-11-tax-category-picker.yaml`

**Report schema:**

```yaml
report:
  generated: "2026-03-11T10:30:00Z"
  plugin_version: "0.2.0"
  config_version: 1
  scope: "src/components/TaxCategoryPicker.tsx"

  summary:
    total_findings: 8
    by_classification:
      accidental: 3
      intentional: 2
      needs_review: 3
    by_severity:
      error: 2
      warning: 4
      info: 2
    by_skill:
      guardian: 3
      token_validator: 2
      implementation_checker: 3
    auto_fixable: 2

  findings:
    - id: "f001"
      file: "src/components/TaxCategoryPicker.tsx"
      line: 42
      skill: "guardian"
      severity: "warning"
      category: "component-alternative-available"
      classification: "intentional"
      description: "Custom <Dropdown> used where <AcmeSelect> exists"
      suggestion: "Replace with <AcmeSelect> if grouped options not needed"
      confidence: 0.82
      auto_fixable: false
      deviation:
        reason: "the design system's Select doesn't support grouped options"
        ticket: "DS-1234"
        approved_by: "@design-system-team"

    - id: "f002"
      file: "src/components/TaxCategoryPicker.tsx"
      line: 67
      skill: "token_validator"
      severity: "error"
      category: "hardcoded-color"
      classification: "accidental"
      description: "Hardcoded color '#333333' should use token"
      suggestion: "Replace with var(--acme-color-text-primary)"
      confidence: 0.98
      auto_fixable: true
```

### Step 5: Present Summary

After generating the report, present a concise summary to the developer:

```
## Deviation Report Generated

Wrote: docs/react-craft/deviations/2026-03-11-tax-category-picker.yaml

| Classification | Count |
|---|---|
| Accidental (auto-fixable) | 2 |
| Accidental (manual fix) | 1 |
| Intentional (justified) | 2 |
| Needs Review | 3 |
| **Total** | **8** |

### Needs Your Input (3 findings):
1. [W] line 55 — Is CustomTooltip intentional? No DS equivalent found.
   Not sure if this is intentional? Check with the DS team: Design System Team (#design-system)
2. [I] line 78 — padding: 12px — use acme-spacing-sm (8px) or acme-spacing-md (16px)?
   Not sure if this is intentional? Check with the DS team: Design System Team (#design-system)
3. [W] line 90 — Custom loading spinner — use <AcmeSkeleton> instead?
   Not sure if this is intentional? Check with the DS team: Design System Team (#design-system)

Reply with your decisions and I'll update the report.
```

## Guidelines

- Reports accumulate — never overwrite previous reports
- Use ISO 8601 timestamps in UTC
- Include the config version so the DS team knows what rules were active
- When presenting needs-review findings, give the developer clear choices
- After developer responds, update the report with their decisions
- Always include the DS team nudge for `needs-review` findings when `support_channel` is configured
- If `notification.webhook` is configured, mention that the report will be sent
