# Design Analyst Reference

Detailed reference material for the Design Analyst agent covering MCP tools, extraction patterns, and validation techniques.

## Figma Console MCP Tools

The Figma Console MCP (by TJ Pitre) is the primary extraction tool. Fall back to the Official Figma MCP if the Console MCP is unavailable.

### Primary Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get_file` | Fetch full file metadata | Initial file validation, small files |
| `get_file_nodes` | Fetch specific nodes by ID | Targeted extraction (preferred for large files) |
| `get_file_components` | List all published components | Discovering component sets and variants |
| `get_file_component_sets` | List component sets | Understanding variant groupings |
| `get_file_styles` | List published styles | Extracting token references |
| `get_image` | Export node as image | Visual verification, screenshot comparison |

### Usage Patterns

**Always start with a lightweight ping.** Before a full extraction, call `get_file` with just the file key to verify access. If this fails (403 or 404), stop and ask the human for correct permissions or a new link.

**Prefer node-level fetches.** For files with many frames, `get_file_nodes` with specific node IDs is dramatically faster than `get_file`. Always request the minimum set of nodes you need.

**Batch node requests.** `get_file_nodes` accepts a comma-separated list of node IDs. Batch related nodes into a single call rather than making one call per node.

```
# Good: single call for all variant nodes
get_file_nodes(file_key, ids="1:42,1:43,1:44,1:45")

# Avoid: separate call per node
get_file_nodes(file_key, ids="1:42")
get_file_nodes(file_key, ids="1:43")
```

### Official Figma MCP (Fallback)

The Official Figma MCP has a similar API surface. Key differences:

- Tool names may use `figma_` prefix
- Node ID format may differ (use `encodeURIComponent` for IDs with colons)
- Rate limits may be stricter

## Extracting Design Tokens

### From Figma Styles

Figma styles map to design tokens. Extract them in order of reliability:

1. **Published styles** (`get_file_styles`): Most reliable. These have stable names like `Colors/Primary/500` or `Typography/Body/Regular`.
2. **Component properties**: Variant properties often encode token values (e.g., `color=primary`, `size=lg`).
3. **Inline values**: Raw hex colors, pixel values, font specs. These are the least reliable and should be mapped to the nearest token.

### Token Mapping Strategy

When you encounter a raw value (e.g., `#1A73E8`), do not record it as-is. Instead:

1. Check if the project's `react-craft.config.yaml` defines a token mapping
2. Look for a matching published style in the Figma file
3. If no match, record both the raw value and your best-guess token name, marked `[NEEDS_VERIFICATION]`

```yaml
# Good
background: "--color-primary-600"  # from published style "Colors/Primary/600"

# Acceptable
background: "--color-primary-600"  # [NEEDS_VERIFICATION] closest match to #1A73E8

# Bad
background: "#1A73E8"  # raw value with no token reference
```

### Color Values

Extract colors in their original format and note:

- Fill colors (background)
- Stroke colors (border)
- Text fill colors
- Effect colors (shadow, blur)
- Opacity values (record separately from color)

### Spacing Values

Figma uses auto-layout for spacing. Extract:

- `itemSpacing` — gap between children
- `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` — container padding
- `layoutMode` — `HORIZONTAL` or `VERTICAL` (maps to flex-direction)
- `primaryAxisAlignItems`, `counterAxisAlignItems` — alignment (maps to justify-content, align-items)

### Typography Values

From text nodes, extract:

- `fontFamily`
- `fontSize` (in px)
- `fontWeight` (numeric: 400, 500, 600, 700)
- `lineHeightPx` or `lineHeightPercent`
- `letterSpacing` (in px or percent)
- `textCase` (UPPER, LOWER, TITLE, ORIGINAL)
- `textDecoration` (UNDERLINE, STRIKETHROUGH, NONE)

## Common Figma Structure Patterns

### Component Sets (Variants)

Figma groups variants into Component Sets. A component set for a Button might contain:

```
Button (Component Set)
├── Type=Primary, Size=Large, State=Default
├── Type=Primary, Size=Large, State=Hover
├── Type=Primary, Size=Large, State=Disabled
├── Type=Secondary, Size=Large, State=Default
├── ...
```

The variant properties (`Type`, `Size`, `State`) become your variant matrix. Extract all unique values for each property.

### States as Layers

Some designers encode states not as variants but as layers within a single frame:

```
Button
├── Default (visible)
├── Hover (hidden)
├── Focus (hidden)
├── Active (hidden)
└── Disabled (hidden)
```

Check layer visibility. If you see multiple layers with state-like names and only one visible, these are likely interactive states.

### States as Separate Frames

Another pattern: states as sibling frames on the canvas, often labeled:

```
Button / Default
Button / Hover
Button / Focus
Button / Pressed
Button / Disabled
```

Look for naming patterns with `/` or ` - ` separators.

### Responsive Variants

Designers sometimes show responsive behavior as:

- Separate frames at different widths (e.g., "Mobile", "Tablet", "Desktop")
- A single frame with annotations about reflow
- Auto-layout constraints that imply responsive behavior

When you find frames at different widths, record the breakpoint and what changes between them (layout direction, visibility of elements, spacing, font size).

### Slot Patterns

Components often have named slots indicated by:

- Layers named `[slot]`, `{icon}`, or `<leading>`
- Boolean properties like `hasIcon`, `showAvatar`
- Instance swap properties (component property type `INSTANCE_SWAP`)

Record each slot with its constraints (required/optional, accepted content types).

## Anova YAML Schema Overview

Anova exports structured YAML from Figma with this approximate shape:

```yaml
component:
  name: Button
  description: "Primary action button"
  figma:
    fileKey: abc123
    nodeId: "1:42"

variants:
  - name: primary
    properties:
      type: primary
      size: large
    tokens:
      backgroundColor: "--color-primary-600"
      textColor: "--color-white"
      borderRadius: "--radius-md"
      padding: "--space-3 --space-5"

  - name: secondary
    properties:
      type: secondary
      size: large
    tokens:
      backgroundColor: "transparent"
      textColor: "--color-primary-600"
      borderColor: "--color-primary-600"

states:
  - name: hover
    changes:
      backgroundColor: "--color-primary-700"
  - name: focus
    changes:
      outline: "2px solid --color-focus-ring"
  - name: disabled
    changes:
      opacity: 0.5
      cursor: not-allowed

typography:
  label:
    fontFamily: "--font-sans"
    fontSize: "--text-sm"
    fontWeight: 600
    lineHeight: "--leading-tight"

spacing:
  padding: "--space-3 --space-5"
  gap: "--space-2"

slots:
  - name: leadingIcon
    required: false
    type: icon
  - name: label
    required: true
    type: text
    minLength: 1
    maxLength: 40
```

When processing Anova YAML:

1. Validate required top-level keys: `component`, `variants`
2. Map `tokens` values directly to the brief's Design Tokens section
3. Map `states` to the brief's States section
4. Cross-reference `figma.fileKey` and `figma.nodeId` against any provided Figma link

## Asking Good Clarification Questions

When you encounter a gap, ask a specific, actionable question. Avoid vague requests.

### Good Questions

> "The Button component has Primary and Secondary variants, but I don't see a Tertiary/Ghost variant. Should there be one? If yes, share a node link."

> "The hover state shows a darker background (#1557B0) but I can't find a matching token. Is this `--color-primary-700` or a one-off value?"

> "I see the component at 1440px width but no mobile breakpoint. At <640px, should it: (a) stay the same, (b) go full-width, or (c) collapse to icon-only?"

> "The disabled state reduces opacity to 50%. Does the disabled state also change the cursor? Should it prevent all pointer events or just click?"

### Bad Questions

> "Can you tell me more about the component?" (too vague)

> "What about accessibility?" (too broad, and it is your job to extract what is there)

> "Is this right?" (no context for what "this" refers to)

### When to Ask vs. When to Extract

- **Ask** when information is genuinely missing from the Figma file (no loading state exists anywhere)
- **Extract** when information is present but in an unexpected location (loading state is on a separate page)
- **Ask** when there is ambiguity (two conflicting color values for the same state)
- **Extract** when there is a clear convention (all other components in the file use the same token)

## Color Contrast Pre-Check

Before finalizing the brief, run a preliminary contrast check on every text-over-background combination. This is not a full accessibility audit (that is the Accessibility Auditor's job), but catching obvious failures early saves remediation time.

### WCAG AA Thresholds

| Content Type | Minimum Contrast Ratio |
|--------------|----------------------|
| Normal text (< 18px or < 14px bold) | 4.5:1 |
| Large text (>= 18px or >= 14px bold) | 3:1 |
| UI components and graphical objects | 3:1 |

### How to Check

1. Extract the foreground (text) and background colors as hex values
2. Calculate relative luminance for each: `L = 0.2126 * R + 0.7152 * G + 0.0722 * B` (where R, G, B are linearized sRGB values)
3. Contrast ratio = `(L1 + 0.05) / (L2 + 0.05)` where L1 is the lighter color

### What to Record

For each text-background pair in the brief:

```markdown
| Pair | Foreground | Background | Ratio | Pass? |
|------|------------|------------|-------|-------|
| Primary label | #FFFFFF | #1A73E8 | 4.6:1 | AA normal |
| Disabled label | #9E9E9E | #F5F5F5 | 2.8:1 | FAIL |
```

Mark failures in the brief's Accessibility Notes section. If a contrast failure exists in the Figma source, flag it as `[CONTRAST_FAIL]` rather than silently fixing it. The Accessibility Auditor will handle remediation recommendations.

### Gradient and Image Backgrounds

When text sits on a gradient or image background:

- For gradients: check contrast against both the lightest and darkest points where text appears
- For images: note `[CONTRAST_REQUIRES_OVERLAY_CHECK]` since static analysis is insufficient
- Record the observation so the Visual Reviewer can verify with a screenshot

## Output Checklist

Before writing the final brief, verify:

- [ ] `figma-raw.json` written with `_meta` key
- [ ] All variant properties listed with their possible values
- [ ] Every state has both Appearance and Behavior columns filled
- [ ] Token references use project conventions (check `react-craft.config.yaml`)
- [ ] No raw hex/px values without a token mapping attempt
- [ ] Color contrast pre-check table included
- [ ] All `[PENDING]` items have a corresponding clarification question asked to the human
- [ ] Brief follows the template structure from SKILL.md
