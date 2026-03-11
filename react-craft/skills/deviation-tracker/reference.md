# Deviation Tracker Reference

Classification algorithms, report schema details, and configuration reference.

## Configuration

The Deviation Tracker reads its configuration from `react-craft.config.yaml`:

```yaml
design_system:
  name: "Acme DS"
  support_channel: "#design-system"
  support_label: "Design System Team"

# Classification behavior
classification_mode: "assisted"  # assisted | auto | manual

# Where deviation reports are written
report_path: "docs/react-craft/deviations/"

# Optional: webhook for notifying the DS team
notification:
  webhook: "https://hooks.slack.com/services/..."
  channel: "#design-system-deviations"

# Components that should always be classified as intentional
allowlist:
  - "CustomTooltip"
  - "LegacyDatePicker"
```

## Classification Algorithm

### Assisted Mode (Default)

```
FOR each finding:
  IF @ds-deviation comment with reason exists within 3 lines above:
    classification = "intentional"
    attach deviation metadata (reason, ticket, approved-by, expires)

  ELSE IF component is in config allowlist:
    classification = "intentional"
    reason = "Listed in project allowlist"

  ELSE IF finding.skill == "token_validator" AND finding.confidence > 0.90 AND single match:
    classification = "accidental"

  ELSE IF finding.skill == "guardian" AND finding.confidence > 0.85 AND direct role match:
    classification = "accidental"

  ELSE IF finding.skill == "implementation_checker" AND DS component provides the missing feature:
    classification = "accidental"

  ELSE:
    classification = "needs-review"
```

### Auto Mode

Same as assisted but with these modified thresholds:

| Rule | Assisted Threshold | Auto Threshold |
|------|-------------------|----------------|
| Token exact match | > 0.90 | > 0.75 |
| Guardian role match | > 0.85 | > 0.70 |
| Token near match with single candidate | needs-review | accidental (> 0.75) |

### Manual Mode

All findings -> `needs-review`. No auto-classification.

## @ds-deviation Comment Format

### Recognized Comment Patterns

```tsx
// @ds-deviation reason="explanation here"
// @ds-deviation ticket="DS-1234"
// @ds-deviation approved-by="@username"
// @ds-deviation expires="2026-Q3"

/* @ds-deviation reason="multi-line OK in block comments"
   ticket="DS-1234" */

{/* @ds-deviation reason="JSX comments work too" */}
```

### Association Rules

A `@ds-deviation` comment is associated with a finding if:

1. The comment is on the **same line** as the finding
2. The comment is on any of the **3 lines immediately above** the finding's line
3. The comment is at the **top of the containing block** (e.g., top of a function component) and the finding is within that block

Rule 3 allows a single `@ds-deviation` comment at the top of a component to cover all findings within it:

```tsx
// @ds-deviation reason="legacy component, migration planned" ticket="PROJ-567" expires="2026-Q4"
export function LegacyWidget() {
  // All findings in this component are covered by the deviation above
}
```

### Required Keys for Classification

- `reason` is **required** for `intentional` classification. Without it, the finding stays `needs-review` even if a `@ds-deviation` comment exists.
- All other keys (`ticket`, `approved-by`, `expires`) are optional metadata.

## DS Team Nudge

For `needs-review` findings, the tracker includes a nudge directing the developer to their design system team. This requires `design_system.support_channel` and `design_system.support_label` to be set in config.

**Nudge template:**

```
Not sure if this is intentional? Check with the DS team: {support_label} ({support_channel})
```

**Example output:**

```
Not sure if this is intentional? Check with the DS team: Design System Team (#design-system)
```

If the config values are missing, the nudge is omitted entirely (no broken template).

## Report Schema

### Finding ID Generation

Finding IDs are sequential within a report: `f001`, `f002`, etc. They are NOT stable across reports — the same code issue will get a different ID in a different report run.

For stable tracking across time, use the combination of: `file` + `line` + `category`.

### Report Accumulation

Reports accumulate in the `report_path` directory. Each audit run creates a new file. The DS team can track trends by reading the directory:

```
docs/react-craft/deviations/
  2026-03-11-tax-category-picker.yaml
  2026-03-11-full-audit.yaml
  2026-03-12-user-profile.yaml
```

Never overwrite or delete previous reports. If the same scope is audited twice on the same day, append a counter: `2026-03-11-tax-category-picker-2.yaml`.

### Updating Reports

When a developer responds with classification decisions for `needs-review` findings, update the existing report file:

1. Read the report
2. Find the finding by ID
3. Update `classification` and add `deviation` metadata
4. Write the file back
5. Confirm the update to the developer
