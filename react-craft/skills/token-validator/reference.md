# Token Validator Reference

Detailed reference material for token formats, matching algorithms, and configuration.

## Configuration

The Token Validator reads its configuration from `react-craft.config.yaml`:

```yaml
design_system:
  token_sources:
    # DTCG format (primary — W3C standard)
    - path: "src/tokens/tokens.json"
      format: "dtcg"
    # CSS custom properties
    - path: "src/styles/tokens.css"
      format: "css"
    # SCSS variables
    - path: "src/styles/_tokens.scss"
      format: "scss"

detection:
  styling_method: "tailwind"  # css-modules | tailwind | styled-components | emotion | vanilla-extract | vanilla
```

## DTCG Token Format (.tokens.json)

The W3C Design Tokens Community Group format is the primary supported format. It uses `$value` and `$type` keys:

```json
{
  "color": {
    "$type": "color",
    "primary": {
      "500": { "$value": "#2CA01C" },
      "600": { "$value": "#248A17" }
    },
    "text": {
      "primary": { "$value": "#333333" },
      "secondary": { "$value": "#666666" },
      "muted": { "$value": "#999999" }
    },
    "background": {
      "primary": { "$value": "#FFFFFF" },
      "secondary": { "$value": "#F5F5F5" }
    },
    "border": {
      "default": { "$value": "#CCCCCC" },
      "light": { "$value": "#EEEEEE" }
    }
  },
  "spacing": {
    "$type": "dimension",
    "xs": { "$value": "4px" },
    "sm": { "$value": "8px" },
    "md": { "$value": "16px" },
    "lg": { "$value": "24px" },
    "xl": { "$value": "32px" }
  },
  "typography": {
    "fontSize": {
      "$type": "dimension",
      "xs": { "$value": "11px" },
      "sm": { "$value": "12px" },
      "md": { "$value": "14px" },
      "lg": { "$value": "16px" },
      "xl": { "$value": "18px" }
    },
    "fontWeight": {
      "$type": "fontWeight",
      "regular": { "$value": 400 },
      "medium": { "$value": 500 },
      "semibold": { "$value": 600 },
      "bold": { "$value": 700 }
    },
    "fontFamily": {
      "$type": "fontFamily",
      "sans": { "$value": "Helvetica Neue, Arial, sans-serif" },
      "mono": { "$value": "SF Mono, Menlo, monospace" }
    }
  },
  "borderRadius": {
    "$type": "dimension",
    "sm": { "$value": "4px" },
    "md": { "$value": "8px" },
    "lg": { "$value": "12px" },
    "full": { "$value": "9999px" }
  },
  "shadow": {
    "$type": "shadow",
    "sm": { "$value": "0 1px 2px rgba(0, 0, 0, 0.05)" },
    "md": { "$value": "0 4px 12px rgba(0, 0, 0, 0.15)" }
  }
}
```

### DTCG Parsing Rules

1. Walk the JSON tree recursively
2. A node with a `$value` key is a token leaf
3. The token name is the dot-separated path from root: `color.text.primary`
4. Convert to CSS custom property name: `--color-text-primary`
5. If the design system has a prefix (from `design_system.component_prefix`), prepend it: `--acme-color-text-primary`
6. The `$type` can be inherited from parent groups (a `$type` on a group applies to all children that don't override it)

## CSS Custom Properties Parsing

Parse `:root` blocks and extract `--name: value` pairs:

```css
:root {
  --acme-color-primary: #2CA01C;
  --acme-spacing-md: 16px;
}
```

Parsing:
1. Find all `--[name]: [value];` patterns
2. Strip whitespace and trailing semicolons
3. Handle multi-line values (e.g., shadow values that span lines)
4. Resolve `var()` references when possible (e.g., `--color-brand: var(--color-primary-500)`)

## Value Matching Algorithm

### Color Matching

1. Normalize all colors to 6-digit hex (lowercase): `#fff` -> `#ffffff`, `rgb(255,255,255)` -> `#ffffff`
2. Exact match: `#333333` matches token `#333333` -> 95-100% confidence
3. Near match: calculate color distance using simple RGB Euclidean distance
   - Distance < 10: confidence 80%
   - Distance < 30: confidence 60%
   - Distance >= 30: no match
4. For colors with alpha: match the color component and report the alpha separately

### Spacing Matching

1. Normalize to pixels: `1rem` -> `16px` (assuming 16px base)
2. Exact match: `16px` matches `--spacing-md: 16px` -> 95% confidence
3. Near match: if value falls between two tokens, suggest both
   - e.g., `12px` is between `--spacing-sm` (8px) and `--spacing-md` (16px) -> 50% confidence for each

### Typography Matching

1. Font sizes: direct pixel comparison
2. Font weights: match numeric values (`400` = `regular`, `700` = `bold`)
3. Font families: fuzzy match on first family name (ignore fallbacks)

## Styling Method Output

The replacement suggestion depends on the project's `detection.styling_method`:

| Method | Suggestion Format |
|--------|------------------|
| `vanilla` / `css-modules` | `var(--acme-color-text-primary)` |
| `tailwind` | `text-[--acme-color-text-primary]` or Tailwind utility class |
| `styled-components` / `emotion` | `${theme.color.text.primary}` or `var(--acme-color-text-primary)` |
| `vanilla-extract` | `vars.color.text.primary` |
| `scss` | `$acme-color-text-primary` |

## Auto-Fix Criteria

A finding is auto-fixable when ALL of these are true:

1. Confidence >= 90%
2. Single unambiguous token match (not multiple candidates)
3. The replacement is syntactically valid in context
4. The value is not part of a shorthand property (e.g., `border: 1px solid #ccc` needs manual review)
