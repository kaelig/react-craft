# Component Brief Template

Use this template when documenting a component extracted from Figma. Fill in every section. Mark unknowns with `[PENDING]` and a note explaining what information is needed.

---

```yaml
# --- Component Brief Frontmatter ---
name: ""                    # PascalCase component name (e.g., AlertDialog)
figma_url: ""               # Link to the Figma frame or component
variants:                   # List of variant names
  - default
tokens:                     # Design tokens referenced by this component
  colors: []
  spacing: []
  typography: []
  borders: []
  shadows: []
  motion: []
states:                     # Interactive states
  - default
  - hover
  - focus
  - active
  - disabled
gaps: []                    # List of unresolved questions or missing specs
complexity: low             # low | medium | high
```

---

## Component Overview

_One paragraph describing what this component is, when to use it, and its role in the design system._

## Variants

_List each variant with a description of how it differs visually and functionally from the default._

| Variant | Description | Visual Difference |
|---------|-------------|-------------------|
| default | | |

## Design Tokens

_Map every visual property to a design token. If a value appears hardcoded in Figma, flag it._

| Property | Token | Fallback Value |
|----------|-------|----------------|
| | | |

## States

_Describe each interactive state: what triggers it, what changes visually, and any behavioral notes._

| State | Trigger | Visual Change | Notes |
|-------|---------|---------------|-------|
| default | — | — | — |
| hover | Mouse enter | | |
| focus | Tab / programmatic | | |
| active | Mouse down / Enter | | |
| disabled | `disabled` prop | | |

## Responsive Behavior

_How does this component adapt across breakpoints? Describe layout changes, hidden elements, or size adjustments._

| Breakpoint | Behavior |
|------------|----------|
| Mobile (< 640px) | |
| Tablet (640px - 1024px) | |
| Desktop (> 1024px) | |

## Motion / Animation

_Describe any transitions, animations, or motion design. Include duration, easing, and trigger._

| Animation | Trigger | Duration | Easing | Token |
|-----------|---------|----------|--------|-------|
| | | | | |

## Content Requirements

_What text, icons, or media does this component expect? Note character limits, truncation rules, and localization considerations._

## Keyboard Interaction

_How does this component behave with keyboard navigation? Reference WAI-ARIA patterns where applicable._

| Key | Action |
|-----|--------|
| Tab | |
| Enter / Space | |
| Escape | |
| Arrow keys | |

## Gaps

_List anything missing, unclear, or inconsistent in the design spec. Each gap should block or inform downstream work._

- [ ] `[PENDING]` _Description of what is missing and who needs to resolve it._

## Complexity Assessment

_Rate as low / medium / high and explain why. Consider: number of variants, interactive states, composition depth, accessibility requirements, responsive complexity._

**Rating:** low | medium | high

**Rationale:** _Why this rating._

## Handoff Notes

_Anything the Component Architect should know that doesn't fit in the sections above. Warnings, recommendations, constraints._
