# Accessibility Auditor Reference

Detailed reference material for the Accessibility Auditor agent covering the 8-layer testing stack, WCAG 2.2 quick reference, ARIA patterns, keyboard interactions, headless library optimization, and common failures.

## 8-Layer Testing Stack

### Layer 1: eslint-plugin-jsx-a11y

**Package:** `eslint-plugin-jsx-a11y`
**Speed:** Milliseconds (static analysis, no rendering)

**Command:**
```bash
npx eslint --no-eslintrc --plugin jsx-a11y \
  --rule '{"jsx-a11y/alt-text": "error", "jsx-a11y/aria-props": "error", "jsx-a11y/aria-role": "error", "jsx-a11y/click-events-have-key-events": "error", "jsx-a11y/interactive-supports-focus": "error", "jsx-a11y/label-has-associated-control": "error", "jsx-a11y/no-noninteractive-element-interactions": "error", "jsx-a11y/role-has-required-aria-props": "error", "jsx-a11y/tabindex-no-positive": "error"}' \
  <files>
```

**What it catches:**
- Missing `alt` on images
- Invalid ARIA roles and attributes
- Click handlers on elements without keyboard event handlers
- Interactive elements without `tabIndex`
- Labels not associated with form controls
- Non-interactive elements with event handlers
- Positive `tabindex` values (breaks natural tab order)
- Required ARIA attributes missing for a given role

**What it misses:**
- Anything that requires rendering (contrast, focus order, screen reader output)
- Dynamic ARIA attributes set at runtime
- Keyboard behavior (actual key handling logic)
- Context-dependent issues (e.g., heading levels depend on page structure)

### Layer 2: axe-core + JSDOM

**Packages:** `jest-axe`, `@testing-library/react`, `vitest`
**Speed:** ~1 second

**Test template:**
```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('ComponentName accessibility', () => {
  it('default state has no axe violations', async () => {
    const { container } = render(<Component />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('open/active state has no axe violations', async () => {
    const { container } = render(<Component isOpen />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('disabled state has no axe violations', async () => {
    const { container } = render(<Component disabled />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('error state has no axe violations', async () => {
    const { container } = render(<Component error="Invalid input" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Configuring axe rules by level:**
```typescript
// AA (default)
const results = await axe(container, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'] },
});

// AAA
const results = await axe(container, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag22aa', 'best-practice'] },
});

// A only
const results = await axe(container, {
  runOnly: { type: 'tag', values: ['wcag2a', 'best-practice'] },
});
```

**What it catches:**
- Structural ARIA violations (missing required children/parents)
- Duplicate IDs
- Form label associations
- Landmark structure issues
- Missing document language
- Table structure issues

**What it misses:**
- Color contrast (JSDOM does not render CSS)
- Keyboard behavior
- Focus management
- Screen reader announcements
- Visual layout issues

### Layer 3: @guidepup/virtual-screen-reader

**Package:** `@guidepup/virtual-screen-reader`
**Speed:** ~1 second

**Test template:**
```typescript
import { virtual } from '@guidepup/virtual-screen-reader';
import { render } from '@testing-library/react';

describe('ComponentName screen reader', () => {
  afterEach(async () => {
    await virtual.stop();
  });

  it('announces the component role and name', async () => {
    const { container } = render(<Component aria-label="Main menu" />);
    await virtual.start({ container });
    const phrases = [];
    while ((await virtual.lastSpokenPhrase()) !== '') {
      phrases.push(await virtual.lastSpokenPhrase());
      await virtual.next();
    }
    expect(phrases).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/navigation/i),
        expect.stringContaining('Main menu'),
      ])
    );
  });

  it('announces state changes', async () => {
    const { container, getByRole } = render(<Component />);
    await virtual.start({ container });

    // Interact with the component
    await virtual.act(() => {
      getByRole('button').click();
    });

    expect(await virtual.spokenPhraseLog()).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/expanded/i),
      ])
    );
  });
});
```

**What it catches:**
- Missing or incorrect accessible names
- Wrong reading order
- Missing state announcements (expanded, selected, checked)
- Unlabeled regions and landmarks
- Live region announcement issues

**What it misses:**
- Real assistive technology differences (NVDA reads things differently from VoiceOver)
- Visual rendering
- Keyboard behavior (tests announcements, not key handling)
- Platform-specific AT quirks

### Layer 4: Storybook a11y Addon + Vitest

**Packages:** `@storybook/addon-a11y`, `@storybook/experimental-addon-test`, `vitest`
**Speed:** ~5 seconds

**Command:**
```bash
npx vitest run --project storybook <ComponentName>.stories.tsx
```

The Storybook a11y addon runs axe-core against stories rendered in a real browser environment via Vitest browser mode.

**Configuration in `.storybook/main.ts`:**
```typescript
addons: ['@storybook/addon-a11y']
```

**Per-story configuration:**
```typescript
export const Primary: Story = {
  args: { variant: 'primary' },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          // Disable rules that produce false positives for this story
          { id: 'region', enabled: false },
        ],
      },
    },
  },
};
```

**What it catches:**
- Everything axe-core catches, plus CSS-dependent issues like contrast
- Full rendered component in a real browser context
- Multiple story variants tested in a single run

**What it misses:**
- Keyboard interaction
- Focus management
- Dynamic state changes triggered by user interaction
- Screen reader announcements

### Layer 5: @axe-core/playwright

**Package:** `@axe-core/playwright`
**Speed:** ~5 seconds

**Test template:**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('ComponentName WCAG compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/storybook/iframe.html?id=componentname--default');
  });

  test('meets WCAG 2.2 AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('meets WCAG 2.2 AA in hover state', async ({ page }) => {
    await page.hover('[data-testid="component"]');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('meets WCAG 2.2 AA in focus state', async ({ page }) => {
    await page.focus('[data-testid="component"]');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
```

**axe-core tag reference:**

| Tag | WCAG Level |
|-----|------------|
| `wcag2a` | WCAG 2.0 Level A |
| `wcag2aa` | WCAG 2.0 Level AA |
| `wcag2aaa` | WCAG 2.0 Level AAA |
| `wcag21a` | WCAG 2.1 Level A |
| `wcag21aa` | WCAG 2.1 Level AA |
| `wcag22aa` | WCAG 2.2 Level AA |
| `best-practice` | Not WCAG but recommended |

**What it catches:**
- Full WCAG 2.2 compliance in a real browser
- Rendered color contrast
- Focus indicator visibility
- Dynamic content issues

**What it misses:**
- Keyboard workflows (key sequences, focus traps)
- Screen reader announcements
- Subjective quality (is the label meaningful? is the error message helpful?)

### Layer 6: Playwright Keyboard Tests

**Package:** `@playwright/test`
**Speed:** ~5 seconds

**Test template:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('ComponentName keyboard interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/storybook/iframe.html?id=componentname--default');
  });

  test('tab order matches visual order', async ({ page }) => {
    const focusOrder: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('data-testid') || el?.tagName || 'unknown';
      });
      if (focused === 'BODY') break;
      focusOrder.push(focused);
    }
    expect(focusOrder).toEqual(['trigger', 'first-item', 'second-item', 'close']);
  });

  test('Escape closes overlay and restores focus', async ({ page }) => {
    const trigger = page.getByTestId('trigger');
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('focus trap in dialog', async ({ page }) => {
    await page.getByTestId('trigger').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Tab through all focusable elements
    const focusedElements: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid') || 'unknown'
      );
      focusedElements.push(focused);
    }

    // Verify focus never leaves the dialog
    const uniqueElements = [...new Set(focusedElements)];
    // Focus should cycle — the same elements should repeat
    expect(focusedElements.length).toBeGreaterThan(uniqueElements.length);
  });

  test('arrow key navigation in composite widget', async ({ page }) => {
    await page.getByRole('tab', { name: 'First' }).focus();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Second' })).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Third' })).toBeFocused();

    // Wrap around
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'First' })).toBeFocused();
  });
});
```

**What it catches:**
- Broken tab order
- Missing keyboard handlers
- Focus traps that do not cycle correctly
- Missing Escape key handling for overlays
- Focus not restored after overlay close
- Arrow key navigation not implemented for composite widgets

**What it misses:**
- Whether the keyboard behavior is discoverable (no visual cue that arrows work)
- Screen reader interaction mode differences
- Mobile keyboard (on-screen) behavior

### Layer 7: Playwright Contrast Check

**Package:** `@playwright/test`
**Speed:** ~5 seconds

**Test template:**
```typescript
import { test, expect } from '@playwright/test';

test('text elements meet contrast requirements', async ({ page }) => {
  await page.goto('/storybook/iframe.html?id=componentname--default');

  const contrastResults = await page.evaluate(() => {
    const results: Array<{
      element: string;
      foreground: string;
      background: string;
      ratio: number;
      fontSize: number;
      fontWeight: number;
      required: number;
      pass: boolean;
    }> = [];

    const textElements = document.querySelectorAll(
      'p, span, a, button, label, h1, h2, h3, h4, h5, h6, li, td, th, input, textarea, select'
    );

    textElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fg = style.color;
      const bg = getEffectiveBackground(el);
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight);
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
      const required = isLargeText ? 3.0 : 4.5;
      const ratio = calculateContrastRatio(fg, bg);

      results.push({
        element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
        foreground: fg,
        background: bg,
        ratio: Math.round(ratio * 100) / 100,
        fontSize,
        fontWeight,
        required,
        pass: ratio >= required,
      });
    });

    return results;
  });

  const failures = contrastResults.filter((r) => !r.pass);
  expect(failures).toEqual([]);
});

test('focus indicators meet contrast requirements', async ({ page }) => {
  await page.goto('/storybook/iframe.html?id=componentname--default');

  // Tab to each focusable element and check focus indicator
  const focusableSelector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const count = await page.locator(focusableSelector).count();

  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    const hasVisibleFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const outline = style.outline;
      const boxShadow = style.boxShadow;
      // Check that outline is not 'none' or that box-shadow exists
      return (outline !== 'none' && outline !== '' && !outline.startsWith('0px'))
        || (boxShadow !== 'none' && boxShadow !== '');
    });
    expect(hasVisibleFocusIndicator).toBe(true);
  }
});
```

**What it catches:**
- Insufficient text contrast in rendered output
- Missing focus indicators
- Focus indicators that do not meet the 3:1 contrast requirement
- State-specific contrast issues (disabled text, placeholder text)

**What it misses:**
- Contrast on non-text elements (icons, borders) unless specifically targeted
- Contrast changes during animations
- High contrast mode behavior

### Layer 8: Manual Review Checklist

Always generated. See the Manual Review Checklist Template section below.

## WCAG 2.2 AA Quick Reference

Organized by the four WCAG principles.

### Perceivable

| SC | Name | Key Requirement | Testable By |
|----|------|-----------------|-------------|
| 1.1.1 | Non-text Content | All images, icons, and non-text content have text alternatives | Layers 1, 2, 5 |
| 1.2.1 | Audio/Video (Prerecorded) | Provide captions or transcripts | Manual |
| 1.3.1 | Info and Relationships | Structure conveyed visually is also conveyed programmatically (headings, lists, tables, forms) | Layers 2, 5 |
| 1.3.2 | Meaningful Sequence | Reading order matches visual order | Layers 3, 6 |
| 1.3.3 | Sensory Characteristics | Instructions do not rely solely on shape, color, size, visual location, orientation, or sound | Manual |
| 1.3.4 | Orientation | Content not restricted to a single display orientation | Manual |
| 1.3.5 | Identify Input Purpose | Input fields have appropriate `autocomplete` attributes | Layers 2, 5 |
| 1.4.1 | Use of Color | Color is not the only visual means of conveying information | Manual |
| 1.4.2 | Audio Control | Mechanism to pause or stop audio that plays automatically | Manual |
| 1.4.3 | Contrast (Minimum) | 4.5:1 for normal text, 3:1 for large text | Layers 4, 5, 7 |
| 1.4.4 | Resize Text | Text can be resized up to 200% without loss of content or function | Manual |
| 1.4.5 | Images of Text | Real text used instead of images of text | Layers 1, Manual |
| 1.4.10 | Reflow | Content reflows at 320px without horizontal scrolling | Manual |
| 1.4.11 | Non-text Contrast | UI components and graphical objects have 3:1 contrast ratio | Layer 7 |
| 1.4.12 | Text Spacing | Content functions with increased text spacing | Manual |
| 1.4.13 | Content on Hover or Focus | Dismissible, hoverable, and persistent | Layer 6, Manual |

### Operable

| SC | Name | Key Requirement | Testable By |
|----|------|-----------------|-------------|
| 2.1.1 | Keyboard | All functionality available from keyboard | Layers 1, 6 |
| 2.1.2 | No Keyboard Trap | Keyboard focus can be moved away from any component | Layer 6 |
| 2.1.4 | Character Key Shortcuts | Single-character shortcuts can be remapped or disabled | Manual |
| 2.2.1 | Timing Adjustable | Time limits can be turned off, adjusted, or extended | Manual |
| 2.2.2 | Pause, Stop, Hide | Moving, blinking, scrolling content can be paused | Manual |
| 2.3.1 | Three Flashes | No content flashes more than 3 times per second | Manual |
| 2.4.1 | Bypass Blocks | Mechanism to skip repeated content | Layer 5, Manual |
| 2.4.2 | Page Titled | Pages have descriptive titles | Layer 5 |
| 2.4.3 | Focus Order | Focus order preserves meaning and operability | Layer 6 |
| 2.4.4 | Link Purpose (In Context) | Link purpose determinable from link text or context | Layers 2, 5 |
| 2.4.6 | Headings and Labels | Headings and labels are descriptive | Manual |
| 2.4.7 | Focus Visible | Keyboard focus indicator is visible | Layer 7 |
| 2.4.11 | Focus Not Obscured (Minimum) | Focused element is not entirely hidden | Layer 6 |
| 2.5.1 | Pointer Gestures | Multi-point or path-based gestures have single-pointer alternatives | Manual |
| 2.5.2 | Pointer Cancellation | Down-event does not trigger function; up-event or abort available | Manual |
| 2.5.3 | Label in Name | Visible label is part of the accessible name | Layers 2, 3, 5 |
| 2.5.4 | Motion Actuation | Functionality triggered by motion has UI alternative and can be disabled | Manual |
| 2.5.7 | Dragging Movements | Dragging operations have single-pointer alternatives | Manual |
| 2.5.8 | Target Size (Minimum) | Interactive targets are at least 24x24 CSS pixels | Manual |

### Understandable

| SC | Name | Key Requirement | Testable By |
|----|------|-----------------|-------------|
| 3.1.1 | Language of Page | Default language is programmatically determined | Layer 5 |
| 3.1.2 | Language of Parts | Language of passages or phrases is programmatically determined | Manual |
| 3.2.1 | On Focus | Focusing a component does not cause a change of context | Layer 6 |
| 3.2.2 | On Input | Changing a form input does not cause unexpected context change | Manual |
| 3.2.6 | Consistent Help | Help mechanisms are in a consistent location | Manual |
| 3.3.1 | Error Identification | Errors are identified and described in text | Layers 3, Manual |
| 3.3.2 | Labels or Instructions | Form inputs have labels or instructions | Layers 1, 2, 5 |
| 3.3.3 | Error Suggestion | When an error is detected, suggestions are provided | Manual |
| 3.3.7 | Redundant Entry | Information previously entered is auto-populated or available for selection | Manual |
| 3.3.8 | Accessible Authentication (Minimum) | Cognitive function tests are not required for authentication | Manual |

### Robust

| SC | Name | Key Requirement | Testable By |
|----|------|-----------------|-------------|
| 4.1.2 | Name, Role, Value | All UI components have accessible name, role, and value | Layers 2, 3, 5 |
| 4.1.3 | Status Messages | Status messages are programmatically determinable without receiving focus | Layer 3 |

## ARIA Authoring Practices

Keyboard interaction patterns per WAI-ARIA Authoring Practices Guide (APG) for common component patterns.

### Button

**Role:** `button`
**Required attributes:** accessible name (via content, `aria-label`, or `aria-labelledby`)
**Optional attributes:** `aria-pressed` (toggle), `aria-expanded` (menu button), `aria-haspopup`

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter | Activate the button |
| Space | Activate the button |

**Notes:**
- Use `<button>` element (not `<div role="button">`). The native element provides keyboard and click handling for free.
- Toggle buttons use `aria-pressed="true"` / `"false"`.
- Menu buttons use `aria-expanded` and `aria-haspopup="menu"`.

### Link

**Role:** `link` (native `<a>` with `href`)
**Required attributes:** accessible name, `href`

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter | Follow the link |

**Notes:**
- Space does NOT activate links (unlike buttons). Do not add Space handling to links.
- If it navigates, use `<a>`. If it performs an action, use `<button>`.

### Dialog (Modal)

**Role:** `dialog`
**Required attributes:** `aria-modal="true"`, `aria-label` or `aria-labelledby`

**Keyboard:**
| Key | Action |
|-----|--------|
| Tab | Move focus to next focusable element within dialog |
| Shift+Tab | Move focus to previous focusable element within dialog |
| Escape | Close the dialog |

**Focus management:**
1. On open: move focus to the first focusable element (or the dialog itself if no focusable content).
2. Trap focus: Tab and Shift+Tab cycle within the dialog. Focus never escapes to the page behind.
3. On close: return focus to the element that triggered the dialog.
4. Page behind: `inert` attribute or `aria-hidden="true"` on content behind the dialog.

**Notes:**
- Use the native `<dialog>` element when possible. It provides `showModal()` which handles focus trapping and inertness natively.
- Non-modal dialogs (`aria-modal="false"` or omitted) do not trap focus.

### Combobox

**Role:** `combobox` on the input, `listbox` on the popup, `option` on each item
**Required attributes:** `aria-expanded`, `aria-controls` (points to listbox ID), `aria-activedescendant` (points to focused option ID)

**Keyboard:**
| Key | Action |
|-----|--------|
| Down Arrow | Open popup (if closed) or move to next option |
| Up Arrow | Move to previous option |
| Enter | Select the focused option and close popup |
| Escape | Close popup without selecting, clear input (optional) |
| Home | Move to first option |
| End | Move to last option |
| Printable characters | Type-ahead filtering |

**Notes:**
- The input retains DOM focus. The active option is indicated via `aria-activedescendant`, not by moving DOM focus.
- Autocomplete behavior indicated via `aria-autocomplete`: `list`, `inline`, or `both`.

### Tabs

**Roles:** `tablist` on container, `tab` on each tab, `tabpanel` on each panel
**Required attributes:** `aria-selected="true"` on active tab, `aria-controls` on tab (points to panel), `aria-labelledby` on panel (points to tab)

**Keyboard:**
| Key | Action |
|-----|--------|
| Arrow Right | Move to next tab (wraps to first) |
| Arrow Left | Move to previous tab (wraps to last) |
| Home | Move to first tab |
| End | Move to last tab |
| Tab | Move focus into the active tab panel |
| Shift+Tab | Move focus back to the active tab |

**Activation:**
- **Automatic activation (recommended):** Focus change immediately shows the associated panel.
- **Manual activation:** Focus change highlights the tab. Enter or Space activates it.

**Notes:**
- Only the active tab is in the tab order (`tabindex="0"`). Inactive tabs have `tabindex="-1"`.
- Vertical tab lists use Up/Down arrows instead of Left/Right.

### Accordion

**Roles:** heading + button pattern. Each header is a heading element containing a button. The panel is a generic region.
**Required attributes:** `aria-expanded="true"/"false"` on the button, `aria-controls` pointing to the panel

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter | Toggle the associated panel |
| Space | Toggle the associated panel |
| Down Arrow | Move focus to next accordion header (optional) |
| Up Arrow | Move focus to previous accordion header (optional) |
| Home | Move focus to first accordion header (optional) |
| End | Move focus to last accordion header (optional) |

**Notes:**
- Use `<details>` + `<summary>` for simple accordions. This provides expand/collapse behavior natively.
- If using ARIA: each button must be wrapped in a heading element at the appropriate level.

### Menu

**Roles:** `menu` on container, `menuitem` on each item, `menuitemcheckbox` or `menuitemradio` for checkable items
**Required attributes:** `aria-haspopup="menu"` on trigger, `aria-expanded` on trigger

**Keyboard:**
| Key | Action |
|-----|--------|
| Enter | Activate focused menu item |
| Space | Activate focused menu item (or toggle for checkbox/radio items) |
| Down Arrow | Move to next menu item |
| Up Arrow | Move to previous menu item |
| Right Arrow | Open submenu (if present), move to first item |
| Left Arrow | Close submenu, return to parent menu item |
| Home | Move to first menu item |
| End | Move to last menu item |
| Escape | Close menu, return focus to trigger |
| Printable character | Move to next item starting with that character |

**Notes:**
- Menus are for actions (like a right-click context menu), not navigation. For navigation, use a `<nav>` with links.
- Menu items are not in the tab order. Focus is managed via `aria-activedescendant` or roving `tabindex`.

### Listbox

**Roles:** `listbox` on container, `option` on each item
**Required attributes:** `aria-label` or `aria-labelledby` on listbox, `aria-selected` on selected options

**Keyboard:**
| Key | Action |
|-----|--------|
| Down Arrow | Move to next option |
| Up Arrow | Move to previous option |
| Home | Move to first option |
| End | Move to last option |
| Space | Toggle selection (multi-select) |
| Shift+Down/Up | Extend selection (multi-select) |
| Ctrl+A | Select all (multi-select) |
| Printable character | Type-ahead to matching option |

**Notes:**
- Single-select: selection follows focus (moving to an option selects it).
- Multi-select: add `aria-multiselectable="true"` on listbox. Selection is separate from focus.

### Tooltip

**Role:** `tooltip`
**Required attributes:** `aria-describedby` on the trigger pointing to the tooltip

**Keyboard:**
| Key | Action |
|-----|--------|
| Escape | Dismiss the tooltip |
| Tab (to trigger) | Show the tooltip |
| Tab (away from trigger) | Hide the tooltip |

**Notes:**
- Tooltips appear on hover AND focus. They must be dismissible via Escape without moving focus.
- Tooltip content must be persistent (does not disappear while being hovered or while trigger is focused).
- Do not put interactive content in tooltips. Use a `dialog` or `popover` instead.

## Headless Library Test Matrix

When a headless library manages the component pattern, many keyboard and ARIA tests are redundant. Use this matrix to decide what to skip.

### react-aria (@react-aria/*)

| Test Area | Skip? | Reason |
|-----------|-------|--------|
| ARIA roles | Skip | react-aria sets correct roles |
| ARIA attributes (expanded, selected, etc.) | Skip | react-aria manages state attributes |
| Keyboard navigation (arrows, Home, End) | Skip | react-aria handles key events |
| Focus management (trap, restore) | Skip | react-aria FocusScope handles this |
| Screen reader announcements | Skip | react-aria uses ARIA live regions correctly |
| **Color contrast** | **Always test** | **Not handled by the library** |
| **Accessible names/labels** | **Always test** | **Developer provides these** |
| **Custom behavior on top of library** | **Always test** | **Library does not know about custom logic** |
| **Focus indicators (CSS)** | **Always test** | **Styling is developer responsibility** |
| **Composition of multiple components** | **Always test** | **Library handles individual components, not how they combine** |

### Radix UI (@radix-ui/*)

| Test Area | Skip? | Reason |
|-----------|-------|--------|
| ARIA roles | Skip | Radix sets correct roles |
| ARIA attributes | Skip | Radix manages state attributes |
| Keyboard navigation | Skip | Radix handles key events per APG |
| Focus management | Skip | Radix manages focus (FocusTrap, FocusGuards) |
| Screen reader announcements | Skip | Radix uses appropriate ARIA patterns |
| **Color contrast** | **Always test** | **Radix is unstyled** |
| **Accessible names/labels** | **Always test** | **Developer provides via props** |
| **Custom event handlers** | **Always test** | **Custom `onSelect`, `onChange` logic** |
| **Focus indicators (CSS)** | **Always test** | **Unstyled — developer must add focus styles** |
| **Composition** | **Always test** | **How Radix primitives compose together** |

### Headless UI (@headlessui/react)

| Test Area | Skip? | Reason |
|-----------|-------|--------|
| ARIA roles | Skip | Headless UI sets correct roles |
| ARIA attributes | Skip | Headless UI manages attributes |
| Keyboard navigation | Skip | Headless UI handles key events |
| Focus management | Skip | Headless UI manages focus |
| **Color contrast** | **Always test** | **Headless UI is unstyled** |
| **Accessible names/labels** | **Always test** | **Developer provides these** |
| **Custom render props logic** | **Always test** | **render props can introduce issues** |
| **Focus indicators** | **Always test** | **CSS responsibility** |
| **Transition states** | **Always test** | **Headless UI Transition may hide content from AT** |

### Summary: Always Test Regardless of Library

1. **Color contrast** — libraries do not handle visual styling
2. **Accessible names and labels** — developer must provide meaningful text
3. **Focus indicators** — CSS is the developer's responsibility
4. **Custom behavior** — anything layered on top of the library
5. **Composition** — how multiple library components work together
6. **Content in live regions** — developer controls what goes in `aria-live` containers
7. **Error messages** — developer must wire error text to `aria-describedby` or live regions

## Manual Review Checklist Template

The following items cannot be fully automated and require human verification. Generate this checklist in every `a11y-report.md`.

### Content and Language
- [ ] Text alternatives for images/icons accurately describe content or function
- [ ] Error messages are specific and actionable (not just "invalid input")
- [ ] Instructions do not rely solely on color, shape, or visual position
- [ ] Language of content matches the `lang` attribute
- [ ] Abbreviations and jargon are explained on first use (AAA)

### Visual Design
- [ ] Content is readable and functional at 200% zoom
- [ ] Content reflows at 320px wide without horizontal scrolling
- [ ] Content functions with increased text spacing (1.5x line height, 2x paragraph spacing, 0.12em letter spacing, 0.16em word spacing)
- [ ] Information conveyed by color is also conveyed by text, pattern, or icon
- [ ] No content flashes more than 3 times per second
- [ ] Animation respects `prefers-reduced-motion` media query

### Interaction
- [ ] Touch targets are at least 24x24 CSS pixels (WCAG 2.5.8)
- [ ] Multi-point gestures (pinch, swipe) have single-pointer alternatives
- [ ] Drag-and-drop operations have keyboard alternatives
- [ ] Form inputs have visible labels (not just placeholders)
- [ ] Required fields are indicated in a way that does not rely solely on color
- [ ] Autocomplete attributes are set on common input types (name, email, phone, address)

### Navigation
- [ ] Focus order follows a logical reading sequence
- [ ] Focus is not trapped (except in modals, which trap intentionally)
- [ ] Skip navigation link is provided for repeated content blocks
- [ ] Breadcrumbs, navigation, and help are in consistent locations across pages

### Dynamic Content
- [ ] Status messages are announced without receiving focus (live regions)
- [ ] Dynamically loaded content is announced or focus is managed appropriately
- [ ] Timeout warnings give the user at least 20 seconds to extend
- [ ] Content that appears on hover/focus is dismissible (Escape), hoverable, and persistent

### Assistive Technology
- [ ] Component works with screen reader in browse mode and forms/focus mode
- [ ] Component works with voice control (e.g., "click [visible label]")
- [ ] Component works with switch access (single-switch scanning)
- [ ] Component works with screen magnification at 400%

## Common A11y Failures in Generated Components

### Missing Accessible Names

**Problem:** Buttons or links with only icon content and no accessible name.

```tsx
// Bad
<button onClick={onClose}><CloseIcon /></button>

// Good
<button onClick={onClose} aria-label="Close dialog"><CloseIcon /></button>
```

**Fix:** Add `aria-label` to the element, or add visually-hidden text inside it.

### Click Handlers on Non-Interactive Elements

**Problem:** `onClick` on a `<div>` or `<span>` without keyboard support or ARIA role.

```tsx
// Bad
<div onClick={handleSelect}>Option A</div>

// Good
<button type="button" onClick={handleSelect}>Option A</button>

// Also acceptable if semantic element is not suitable
<div role="option" tabIndex={0} onClick={handleSelect} onKeyDown={handleKeyDown}>
  Option A
</div>
```

**Fix:** Use a semantic element (`<button>`, `<a>`), or add `role`, `tabIndex`, and keyboard event handlers.

### Missing Form Labels

**Problem:** Input fields without associated labels.

```tsx
// Bad
<input type="email" placeholder="Email" />

// Good
<label htmlFor="email">Email</label>
<input id="email" type="email" placeholder="you@example.com" />

// Also good (visually hidden label)
<label htmlFor="email" className="sr-only">Email</label>
<input id="email" type="email" placeholder="you@example.com" />
```

**Fix:** Add a `<label>` element with `htmlFor` matching the input's `id`. Use `aria-label` or `aria-labelledby` as alternatives.

### Missing Focus Indicators

**Problem:** `outline: none` or `outline: 0` in CSS without a replacement focus style.

```css
/* Bad */
button:focus {
  outline: none;
}

/* Good */
button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

**Fix:** Use `:focus-visible` instead of `:focus` and provide a visible indicator with at least 3:1 contrast.

### Incorrect Heading Hierarchy

**Problem:** Skipping heading levels (e.g., `<h1>` followed by `<h3>`).

```tsx
// Bad
<h1>Page Title</h1>
<h3>Section Title</h3>

// Good
<h1>Page Title</h1>
<h2>Section Title</h2>
```

**Fix:** Ensure heading levels are sequential. Use CSS for visual sizing, not heading levels.

### Missing Live Region Announcements

**Problem:** Dynamic content updates (toasts, form errors, loading states) not announced to screen readers.

```tsx
// Bad — screen reader user does not know an error appeared
{error && <div className="error">{error}</div>}

// Good — screen reader announces the error
<div role="alert" aria-live="assertive">
  {error && <span>{error}</span>}
</div>

// Good — polite announcement for non-critical updates
<div aria-live="polite" aria-atomic="true">
  {status && <span>{status}</span>}
</div>
```

**Fix:** Wrap dynamic content in a live region (`role="alert"`, `role="status"`, or `aria-live`). The container must exist in the DOM before content is inserted.

### Dialog Without Focus Management

**Problem:** Dialog opens but focus stays on the trigger behind it. User can Tab to elements behind the dialog.

```tsx
// Bad
{isOpen && <div className="dialog">...</div>}

// Good — use native dialog
const dialogRef = useRef<HTMLDialogElement>(null);
useEffect(() => {
  if (isOpen) dialogRef.current?.showModal();
  else dialogRef.current?.close();
}, [isOpen]);

<dialog ref={dialogRef}>...</dialog>
```

**Fix:** Use `<dialog>` with `showModal()`. If using a custom dialog, implement focus trap and set `inert` on background content.

### Missing prefers-reduced-motion Support

**Problem:** Animations play regardless of user preference.

```css
/* Bad */
.element {
  animation: slideIn 300ms ease;
}

/* Good */
.element {
  animation: slideIn 300ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .element {
    animation: none;
  }
}
```

**Fix:** Wrap animations in a `prefers-reduced-motion` media query. Alternatively, use `prefers-reduced-motion: no-preference` as the trigger for animations (progressive enhancement).

### Incorrect ARIA on Custom Widgets

**Problem:** Wrong ARIA roles or missing required attributes on custom widgets.

```tsx
// Bad — role="listbox" requires aria-selected on options
<div role="listbox">
  <div role="option">Item A</div>
  <div role="option">Item B</div>
</div>

// Good
<div role="listbox" aria-label="Choose an item">
  <div role="option" aria-selected="true">Item A</div>
  <div role="option" aria-selected="false">Item B</div>
</div>
```

**Fix:** Refer to the ARIA Authoring Practices section above for required attributes per role.

## axe-core Rule Configuration

### AA Configuration (Default)

```typescript
const axeConfig = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
};
```

### AAA Configuration

```typescript
const axeConfig = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
};
```

### A Configuration

```typescript
const axeConfig = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag21a', 'best-practice'],
  },
};
```

### Disabling Specific Rules

When a rule produces false positives for a known pattern:

```typescript
const axeConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'region': { enabled: false }, // component is rendered outside a landmark in Storybook
    'page-has-heading-one': { enabled: false }, // component-level test, not page-level
  },
};
```

Document every disabled rule in the a11y-report.md with the reason for disabling.

## Color Contrast Calculation

### Formula

1. Convert hex to linear RGB:
   - sRGB: `R_srgb = R_hex / 255`
   - Linear: `R_lin = R_srgb <= 0.04045 ? R_srgb / 12.92 : ((R_srgb + 0.055) / 1.055) ^ 2.4`

2. Calculate relative luminance:
   - `L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin`

3. Contrast ratio:
   - `ratio = (L_lighter + 0.05) / (L_darker + 0.05)`

### Required Ratios

| Content Type | AA | AAA |
|--------------|-----|------|
| Normal text (< 18px, or < 14px bold) | 4.5:1 | 7:1 |
| Large text (>= 18px, or >= 14px bold) | 3:1 | 4.5:1 |
| UI components (borders, icons, focus rings) | 3:1 | 3:1 |
| Incidental text (disabled, decorative, logos) | No requirement | No requirement |

### Common Passing Combinations

| Foreground | Background | Ratio | AA Normal | AA Large |
|------------|------------|-------|-----------|----------|
| `#000000` | `#FFFFFF` | 21:1 | Pass | Pass |
| `#FFFFFF` | `#1A73E8` | 4.6:1 | Pass | Pass |
| `#333333` | `#FFFFFF` | 12.6:1 | Pass | Pass |
| `#767676` | `#FFFFFF` | 4.5:1 | Pass (borderline) | Pass |
| `#757575` | `#FFFFFF` | 4.5:1 | Pass (borderline) | Pass |

### Common Failing Combinations

| Foreground | Background | Ratio | Issue |
|------------|------------|-------|-------|
| `#9E9E9E` | `#FFFFFF` | 2.8:1 | Fails AA normal text |
| `#BDBDBD` | `#FFFFFF` | 1.7:1 | Fails all levels |
| `#FFFFFF` | `#FFEB3B` | 1.1:1 | White on yellow, nearly invisible |
| `#808080` | `#FFFFFF` | 3.9:1 | Fails AA normal, passes AA large |

### Focus Indicator Contrast

WCAG 2.4.11 (Focus Appearance) requires:
- Focus indicator has at least 3:1 contrast against the unfocused state
- Focus indicator has at least 3:1 contrast against adjacent colors
- Focus indicator area is at least as large as a 2px perimeter around the component

Common approach:
```css
:focus-visible {
  outline: 2px solid #005FCC; /* 3:1 against white background */
  outline-offset: 2px;         /* gap ensures contrast against component border */
}
```
