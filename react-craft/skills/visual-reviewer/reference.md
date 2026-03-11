# Visual Reviewer Reference

Detailed reference material for the Visual Reviewer agent covering the 9-dimension comparison checklist, severity classification, CSS property mapping, screenshot best practices, diminishing-returns rules, no-regression verification, and common visual discrepancy patterns.

## 9-Dimension Comparison Checklist

### 1. Layout

**What to check:**
- Overall element arrangement (horizontal vs vertical, grid vs flex)
- Element order in the visual flow
- Alignment of elements (left, center, right, stretch)
- Relative positioning of child elements
- Overflow behavior (visible, hidden, scroll)
- Responsive stacking order
- Element sizing (width, height, aspect ratio)
- Centering (horizontal and vertical)

**CSS properties to inspect:**
- `display` (flex, grid, block, inline-flex)
- `flex-direction`, `flex-wrap`, `align-items`, `justify-content`
- `grid-template-columns`, `grid-template-rows`, `grid-area`
- `position`, `top`, `right`, `bottom`, `left`
- `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`
- `overflow`, `overflow-x`, `overflow-y`
- `aspect-ratio`
- `order`

### 2. Typography

**What to check:**
- Font family matches the design system font
- Font size matches the design token
- Font weight (regular, medium, semibold, bold)
- Line height (leading)
- Letter spacing (tracking)
- Text alignment (left, center, right, justify)
- Text decoration (underline, strikethrough)
- Text transform (uppercase, lowercase, capitalize)
- Text overflow handling (ellipsis, wrap, clip)
- Number of visible lines before truncation

**CSS properties to inspect:**
- `font-family`
- `font-size`
- `font-weight`
- `line-height`
- `letter-spacing`
- `text-align`
- `text-decoration`
- `text-transform`
- `text-overflow`, `white-space`, `overflow`
- `-webkit-line-clamp`, `display: -webkit-box`

### 3. Colors

**What to check:**
- Background color of every visible element
- Text color for all text nodes
- Border colors
- Icon fill/stroke colors
- Gradient direction, stops, and colors
- Opacity values
- Color token usage (not hardcoded hex)
- Dark mode colors (if applicable)
- Semantic color usage (error = red, success = green, etc.)

**CSS properties to inspect:**
- `background-color`, `background`, `background-image` (for gradients)
- `color`
- `border-color`
- `fill`, `stroke` (SVG icons)
- `opacity`
- `--color-*` custom properties (design tokens)

### 4. Spacing

**What to check:**
- Padding inside elements (all four sides)
- Margin between elements (all four sides)
- Gap between flex/grid children
- Overall whitespace distribution
- Consistent spacing rhythm (e.g., 4px grid)
- Space between text elements (headings to body)
- Space between icon and adjacent text
- Inset spacing for interactive elements (click target size)

**CSS properties to inspect:**
- `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`
- `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`
- `gap`, `row-gap`, `column-gap`
- `--spacing-*` custom properties (design tokens)

### 5. Shadows

**What to check:**
- Box shadow presence or absence
- Shadow offset (x, y)
- Shadow blur radius
- Shadow spread radius
- Shadow color and opacity
- Multiple shadow layers
- Inner vs outer shadows (inset)
- Text shadow (rare but possible)
- Elevation hierarchy (higher elements have stronger shadows)

**CSS properties to inspect:**
- `box-shadow`
- `text-shadow`
- `filter: drop-shadow()`
- `--shadow-*` custom properties (design tokens)

### 6. Borders

**What to check:**
- Border width on each side
- Border style (solid, dashed, dotted, none)
- Border color
- Which sides have borders (top, right, bottom, left, or all)
- Divider lines between list items or sections
- Outline (separate from border)
- Border as a focus indicator

**CSS properties to inspect:**
- `border`, `border-top`, `border-right`, `border-bottom`, `border-left`
- `border-width`, `border-style`, `border-color`
- `outline`, `outline-width`, `outline-style`, `outline-color`, `outline-offset`
- `--border-*` custom properties (design tokens)

### 7. Border-radius

**What to check:**
- Corner rounding on all elements
- Consistent radius values across similar elements
- Pill shapes (radius = half the height)
- Circle shapes (radius = 50%)
- Per-corner radius (e.g., top corners rounded, bottom square)
- Radius on nested elements (inner radius should account for parent padding)
- Radius on images and media

**CSS properties to inspect:**
- `border-radius`
- `border-top-left-radius`, `border-top-right-radius`, `border-bottom-right-radius`, `border-bottom-left-radius`
- `--radius-*` custom properties (design tokens)

### 8. Icons

**What to check:**
- Correct icon is used (not a similar-looking substitute)
- Icon size matches the design
- Icon color matches surrounding text or design spec
- Icon alignment relative to adjacent text (vertically centered)
- Icon spacing from adjacent content
- Icon stroke width consistency
- Icon presence (not missing from the rendered output)
- SVG viewBox and dimensions

**CSS properties to inspect:**
- `width`, `height` (on the icon element)
- `fill`, `stroke`, `stroke-width` (SVG properties)
- `color` (for currentColor-based icons)
- `font-size` (for icon fonts)
- `vertical-align` or flex alignment

### 9. States

**What to check:**
- Default state matches the design
- Hover state (background change, text change, shadow change, scale)
- Focus state (focus ring, outline, background change)
- Active/pressed state (pressed appearance, scale down)
- Disabled state (opacity, color change, cursor)
- Loading state (spinner, skeleton, disabled interaction)
- Selected/checked state
- Error state (border color, text color, icon)
- Empty state (placeholder content)
- Transition between states (timing, easing, properties)

**CSS properties to inspect:**
- `:hover` pseudo-class styles
- `:focus-visible` pseudo-class styles
- `:active` pseudo-class styles
- `[disabled]` or `:disabled` styles
- `[aria-selected="true"]`, `[aria-checked="true"]` styles
- `[aria-invalid="true"]` styles
- `transition`, `transition-property`, `transition-duration`, `transition-timing-function`
- `cursor`
- `opacity`
- `pointer-events`

## Severity Classification Rules

### CRITICAL

The rendered component is fundamentally different from the design. A designer would immediately flag this as wrong.

**Examples:**
- Layout direction is wrong (horizontal vs vertical)
- Major elements are missing entirely (icon, label, description)
- Background color is completely wrong (blue instead of white)
- Text color is wrong (dark on dark, light on light, wrong brand color)
- Component is the wrong size category (renders as small when design shows large)
- Elements are in the wrong order
- Flexbox/grid alignment is incorrect (left-aligned when design shows centered)
- Content overflows its container visibly

### MODERATE

The component looks similar but a careful comparison reveals noticeable differences. A designer would note these in a review.

**Examples:**
- Spacing is off by more than 4px (padding, margin, gap)
- Font weight is wrong (400 instead of 500, or 600 instead of 700)
- Font size is off by 2px or more
- Shadow is present but has wrong blur/spread/offset values
- Border-radius is noticeably different (4px vs 8px)
- Icon size is off by 4px or more
- Hover/focus state color is noticeably different
- Opacity on disabled state is wrong (0.5 vs 0.38)
- Line height is off enough to change the apparent spacing

### MINOR

Differences are barely perceptible. Only visible in a direct pixel overlay comparison. Acceptable for production.

**Examples:**
- 1-2px spacing differences
- Color differences within the same hue that are not visible without a color picker (e.g., `#1565C0` vs `#1565C4`)
- Sub-pixel rendering differences between browsers
- Anti-aliasing differences on rounded corners
- Shadow color opacity difference of 0.05 or less
- 1px border-radius difference
- Letter spacing difference of 0.01em or less

### Classification Decision Tree

```
Is a major element missing or in the wrong position?
  YES -> CRITICAL

Is the layout direction or alignment fundamentally wrong?
  YES -> CRITICAL

Is the color visibly wrong (identifiable without a color picker)?
  YES -> CRITICAL

Is the spacing off by more than 4px?
  YES -> MODERATE

Is the font weight or size noticeably different?
  YES -> MODERATE

Is the difference only visible in a direct pixel overlay?
  YES -> MINOR

When in doubt between two levels, choose the higher severity.
```

## Screenshot Capture Best Practices

### Viewport Configuration

- **Width:** 640px for all comparison screenshots
- **Device scale factor:** 1x (not retina) for consistent pixel comparison
- **Background:** Match the design's background color. Default to white (`#FFFFFF`) if not specified.

### Wait Conditions

Before capturing a screenshot, wait for all of the following:

1. **DOM content loaded:** `waitForLoadState('domcontentloaded')`
2. **Network idle:** `waitForLoadState('networkidle')` --- ensures fonts, images, and API data are loaded
3. **Fonts loaded:** `document.fonts.ready` --- ensures web fonts have rendered
4. **CSS transitions settled:** `waitForTimeout(500)` after all other conditions --- allows CSS transitions to complete
5. **Images loaded:** verify all `<img>` elements have `naturalWidth > 0`

```typescript
// Playwright MCP wait sequence
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => {
  const images = Array.from(document.querySelectorAll('img'));
  return Promise.all(
    images.map(img =>
      img.complete ? Promise.resolve() : new Promise(resolve => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
      })
    )
  );
});
await page.waitForTimeout(500);
```

### Consistent Backgrounds

- Set the page background to match the design's canvas color before screenshotting
- For components on dark backgrounds, set `body { background: <dark-color> }` before capture
- Ensure both Figma and Storybook screenshots use the same background color

### Storybook-Specific Notes

- Navigate to the story's iframe URL directly (e.g., `/iframe.html?id=button--primary`) to avoid Storybook UI chrome
- Use `args` URL params if needed to set specific state
- If Storybook has a theme wrapper, ensure it matches the Figma design context

## Diminishing-Returns Rules

These rules are codified and deterministic. The agent does not use judgment to decide when to stop.

### Rule 1: MINOR-Only Threshold

```
IF all 9 dimensions are PASS or MINOR after iteration N-1:
  STOP immediately. Do not run iteration N.
```

Rationale: MINOR differences (1-2px, imperceptible color shifts) are not worth the cost of another iteration (screenshot capture, comparison, potential regression risk).

### Rule 2: Maximum Iterations

```
IF iteration count reaches 5:
  STOP. Report remaining discrepancies as-is.
```

Rationale: 5 iterations is sufficient for structural + polish fixes. If the component still has CRITICAL issues after 5 targeted fixes, it likely needs architectural changes beyond the Visual Reviewer's scope.

### Rule 3: No Progress

```
IF iteration N did not improve any dimension (all classifications unchanged):
  STOP. The fix did not have the intended effect.
```

Rationale: Repeating ineffective fixes wastes budget. Log the attempted fix and its lack of effect in the report.

### Rule 4: Regression Revert

```
IF a fix causes a regression (a PASS dimension becomes MODERATE or CRITICAL):
  Revert the fix immediately.
  Log the conflict.
  Move to the next discrepancy.
  This counts as one iteration.
```

Rationale: Never trade one regression for another. The net quality must improve with each iteration.

## No-Regression Verification Checklist

After each fix, verify ALL of the following:

1. **Layout still intact:** Element order, alignment, and sizing unchanged
2. **Typography preserved:** No font changes leaked into other text elements
3. **Colors stable:** Background, text, and border colors unchanged on non-targeted elements
4. **Spacing consistent:** No margin/padding changes on non-targeted elements
5. **Shadows preserved:** Shadow presence and values unchanged on non-targeted elements
6. **Borders preserved:** Border width, style, color unchanged on non-targeted elements
7. **Border-radius preserved:** Corner rounding unchanged on non-targeted elements
8. **Icons intact:** Icon presence, size, color unchanged
9. **States still work:** Hover, focus, disabled states unchanged on non-targeted elements

**Regression detection method:**

Compare the post-fix dimension classifications against the pre-fix classifications. Any dimension that was PASS and is now MODERATE or CRITICAL is a regression. MINOR downgrade from PASS is acceptable only if the fix resolved a CRITICAL issue elsewhere.

## Common Visual Discrepancy Patterns and Fixes

### Pattern 1: Wrong Flexbox Direction

**Symptom:** Elements are stacked vertically but should be horizontal (or vice versa).
**Dimension:** Layout (CRITICAL)
**Root cause:** `flex-direction` is `column` instead of `row` (or vice versa).
**Fix:**
```css
/* Before */
.container { display: flex; flex-direction: column; }

/* After */
.container { display: flex; flex-direction: row; }
```

### Pattern 2: Spacing Uses Hardcoded Values Instead of Tokens

**Symptom:** Spacing is close but not exactly right. Often off by 2-4px.
**Dimension:** Spacing (MODERATE)
**Root cause:** Hardcoded `px` values instead of design token custom properties.
**Fix:**
```css
/* Before */
.element { padding: 14px 18px; gap: 10px; }

/* After */
.element { padding: var(--spacing-4) var(--spacing-5); gap: var(--spacing-3); }
```

### Pattern 3: Wrong Font Weight

**Symptom:** Text looks too thin or too thick compared to the design.
**Dimension:** Typography (MODERATE)
**Root cause:** Using `normal` (400) instead of `medium` (500), or `bold` (700) instead of `semibold` (600).
**Fix:**
```css
/* Before */
.heading { font-weight: bold; }

/* After */
.heading { font-weight: var(--font-weight-semibold); } /* 600 */
```

### Pattern 4: Missing Box Shadow

**Symptom:** Component looks flat when the design shows elevation.
**Dimension:** Shadows (MODERATE)
**Root cause:** Shadow not applied, or wrong shadow token used.
**Fix:**
```css
/* Before */
.card { /* no shadow */ }

/* After */
.card { box-shadow: var(--shadow-md); }
```

### Pattern 5: Border-Radius Mismatch

**Symptom:** Corners are too sharp or too round.
**Dimension:** Border-radius (MODERATE)
**Root cause:** Wrong radius value or missing radius token.
**Fix:**
```css
/* Before */
.button { border-radius: 4px; }

/* After */
.button { border-radius: var(--radius-lg); } /* 8px */
```

### Pattern 6: Color Not From Token

**Symptom:** Color is close but not exact. Often a slightly different shade.
**Dimension:** Colors (MODERATE or MINOR depending on visibility)
**Root cause:** Hardcoded hex value instead of design token.
**Fix:**
```css
/* Before */
.button { background-color: #1976D2; }

/* After */
.button { background-color: var(--color-primary); }
```

### Pattern 7: Missing Disabled State Styles

**Symptom:** Disabled state looks identical to the default state, or uses the wrong opacity.
**Dimension:** States (CRITICAL if missing entirely, MODERATE if opacity is wrong)
**Root cause:** No styles for the disabled state, or wrong opacity value.
**Fix:**
```css
/* Before */
.button:disabled { opacity: 0.5; }

/* After */
.button:disabled {
  opacity: var(--opacity-disabled); /* 0.38 */
  cursor: not-allowed;
  pointer-events: none;
}
```

### Pattern 8: Icon Size or Color Mismatch

**Symptom:** Icon is too large/small or the wrong color relative to the design.
**Dimension:** Icons (MODERATE)
**Root cause:** Icon inherits wrong size or color from parent, or has hardcoded values.
**Fix:**
```css
/* Before */
.icon { width: 20px; height: 20px; color: black; }

/* After */
.icon { width: var(--icon-size-md); height: var(--icon-size-md); color: var(--color-icon-primary); }
```

### Pattern 9: Hover State Missing or Wrong

**Symptom:** No visual feedback on hover, or the wrong background/color change.
**Dimension:** States (MODERATE)
**Root cause:** Missing `:hover` pseudo-class styles or wrong token.
**Fix:**
```css
/* Before */
.button:hover { background-color: #1565C0; }

/* After */
.button:hover { background-color: var(--color-primary-hover); }
```

### Pattern 10: Text Truncation Not Applied

**Symptom:** Long text wraps to multiple lines when the design shows truncation with ellipsis.
**Dimension:** Typography (MODERATE)
**Root cause:** Missing overflow and text-overflow properties.
**Fix:**
```css
/* Before */
.label { /* no truncation */ }

/* After */
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Pattern 11: Gap vs Margin Inconsistency

**Symptom:** Spacing between items is inconsistent. Some gaps are right, others are wrong.
**Dimension:** Spacing (MODERATE)
**Root cause:** Using `margin` on children instead of `gap` on the flex/grid parent. Margins double up between adjacent elements.
**Fix:**
```css
/* Before */
.item { margin-bottom: 8px; }
.item:last-child { margin-bottom: 0; }

/* After (on parent) */
.container { display: flex; flex-direction: column; gap: var(--spacing-2); }
```

### Pattern 12: Transition Missing or Too Fast

**Symptom:** State changes feel abrupt compared to the design's smooth transitions.
**Dimension:** States (MINOR unless the design explicitly specifies animation)
**Root cause:** No transition property or wrong duration.
**Fix:**
```css
/* Before */
.button { /* no transition */ }

/* After */
.button {
  transition: background-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .button { transition: none; }
}
```
