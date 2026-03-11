# Design System Guardian Reference

Detailed heuristics for the Design System Guardian's component matching logic and configuration.

## Configuration

The Guardian reads its configuration from `react-craft.config.yaml`:

```yaml
design_system:
  name: "Acme DS"
  component_prefix: "Acme"
  manifest_cache: ".react-craft/manifest.json"
  support_channel: "#design-system"
  support_label: "Design System Team"

# Optional: components that should never be flagged
allowlist:
  - "CustomTooltip"        # No DS equivalent yet
  - "LegacyDatePicker"     # Migration planned for Q3

scope:
  exclude:
    - "**/*.test.*"
    - "**/*.stories.*"
    - "**/__mocks__/**"
    - "**/__tests__/**"
```

## Matching Strategy

The Guardian uses a three-tier matching approach:

### Tier 1: Direct Role Match (High Confidence)

Match native HTML elements to DS components by semantic role:

| HTML Element / Pattern | DS Component | Confidence |
|---|---|---|
| `<select>` | PrefixSelect | 95% |
| `<input type="text">` (and similar) | PrefixInput | 95% |
| `<button>`, `<a>` styled as button | PrefixButton | 90% |
| `<dialog>`, div with `role="dialog"` | PrefixModal | 90% |
| `<div role="alert">`, `.alert` class | PrefixAlert | 85% |

Where `Prefix` is the `design_system.component_prefix` from config.

### Tier 2: Name Similarity Match (Medium Confidence)

Match custom component names that suggest they're recreating DS functionality:

- Component name contains "Button", "Btn" -> check against DS Button
- Component name contains "Select", "Dropdown", "Picker" -> check against DS Select
- Component name contains "Input", "TextField", "TextBox" -> check against DS Input
- Component name contains "Modal", "Dialog", "Popup" -> check against DS Modal
- Component name contains "Alert", "Toast", "Notification" -> check against DS Alert
- Component name contains "Card", "Panel", "Tile" -> check against DS Card
- Component name contains "Skeleton", "Loader", "Placeholder" -> check against DS Skeleton

**Confidence:** 60-80% depending on name overlap.

### Tier 3: Structural Pattern Match (Low Confidence)

Detect HTML patterns that resemble DS components:

- `<div>` with `onClick` handler + button-like styling -> possible DS Button
- `<ul>` / `<div>` with list items + selection logic -> possible DS Select
- `<div>` with overlay/backdrop + close handler -> possible DS Modal
- `<div>` with icon + message + colored background -> possible DS Alert

**Confidence:** 40-60%. Always mark as `info` severity.

## Exclusion Rules

Do NOT flag:

1. Components in the config `allowlist`
2. Components with `@ds-deviation` comments
3. Components in test files, stories, or mocks
4. Third-party library components (check if import path is `node_modules/`)
5. Components that extend/wrap a DS component (they're composing, not replacing)
6. Utility/layout components that don't have DS equivalents (e.g., custom grid layouts)

## Handling DS Component Limitations

When the manifest includes a `limitations` field for a component, check if the developer's use case falls within a known limitation. If so:

- Still report the finding (the DS team needs to know)
- Lower severity to `info`
- Include the limitation in the finding message
- Suggest filing a feature request with the DS team

## Manifest Schema

The Guardian expects the manifest to follow this shape:

```json
{
  "components": [
    {
      "name": "AcmeButton",
      "role": "button",
      "props": {
        "required": ["onClick"],
        "optional": ["variant", "size", "disabled"]
      },
      "variants": ["primary", "secondary", "ghost"],
      "limitations": ["No icon-only variant yet"]
    }
  ]
}
```

When using Storybook MCP, the manifest is derived from the component documentation. Map Storybook's `argTypes` to the `props` schema above.
