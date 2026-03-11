# Accessibility Reference

> Last updated: 2026-03. Verify against Context7 when available.

WCAG 2.2 AA reference for React component development, organized for practical use.

---

## Table of Contents

- [WCAG 2.2 AA Quick Reference](#wcag-22-aa-quick-reference)
- [ARIA Roles and Properties](#aria-roles-and-properties)
- [Keyboard Interaction Patterns](#keyboard-interaction-patterns)
- [Focus Management](#focus-management)
- [Color and Contrast](#color-and-contrast)
- [Motion and prefers-reduced-motion](#motion-and-prefers-reduced-motion)
- [Screen Reader Considerations](#screen-reader-considerations)

---

## WCAG 2.2 AA Quick Reference

### Perceivable

| Criterion | Requirement | Component Impact |
|-----------|-------------|------------------|
| 1.1.1 Non-text Content | All images have text alternatives | `alt` on `<img>`, `aria-label` on icon buttons |
| 1.3.1 Info and Relationships | Structure conveyed visually is conveyed programmatically | Use semantic HTML: headings, lists, tables, `<fieldset>` |
| 1.3.5 Identify Input Purpose | Input fields declare autocomplete purpose | `autocomplete` attribute on form inputs |
| 1.4.1 Use of Color | Color is not the only visual means of conveying info | Add icons, text, or patterns alongside color cues |
| 1.4.3 Contrast (Minimum) | 4.5:1 for normal text, 3:1 for large text | Verify every text-background pair |
| 1.4.11 Non-text Contrast | 3:1 for UI components and graphical objects | Borders, icons, focus indicators, form controls |
| 1.4.13 Content on Hover/Focus | Dismissible, hoverable, persistent | Tooltips must not trap or vanish unexpectedly |

### Operable

| Criterion | Requirement | Component Impact |
|-----------|-------------|------------------|
| 2.1.1 Keyboard | All functionality available from keyboard | Every interactive element must be keyboard-operable |
| 2.1.2 No Keyboard Trap | Focus can always be moved away | Modal focus traps must release on close |
| 2.4.3 Focus Order | Focus order preserves meaning | DOM order matches visual order |
| 2.4.7 Focus Visible | Keyboard focus indicator is visible | Never `outline: none` without a replacement |
| 2.4.11 Focus Not Obscured | Focused element is not fully hidden | Sticky headers/footers must not cover focused elements |
| 2.5.5 Target Size (Enhanced) | Minimum 24x24px (AA), recommend 44x44px | Touch targets, clickable areas |
| 2.5.8 Target Size (Minimum) | Minimum 24x24px or adequate spacing | New in WCAG 2.2 |

### Understandable

| Criterion | Requirement | Component Impact |
|-----------|-------------|------------------|
| 3.2.1 On Focus | Focus alone does not trigger context change | No navigation or submission on focus |
| 3.2.2 On Input | Changing a control does not trigger unexpected context change | Warn before auto-submission |
| 3.3.1 Error Identification | Errors are identified and described in text | `aria-invalid`, `aria-describedby` pointing to error message |
| 3.3.2 Labels or Instructions | Inputs have labels | `<label>` with `htmlFor`, or `aria-label` |
| 3.3.8 Accessible Authentication | No cognitive function test for auth | New in WCAG 2.2, allow paste in password fields |

### Robust

| Criterion | Requirement | Component Impact |
|-----------|-------------|------------------|
| 4.1.2 Name, Role, Value | Custom controls expose name, role, state | ARIA attributes on non-semantic elements |
| 4.1.3 Status Messages | Status updates announced without focus | `role="status"`, `role="alert"`, `aria-live` |

---

## ARIA Roles and Properties

### Button

```tsx
// Prefer semantic <button>. ARIA only when styling constraints require a non-button element.
<button type="button" aria-pressed={isToggled}>Toggle</button>

// Icon-only button: always provide accessible name
<button type="button" aria-label="Close dialog">
  <CloseIcon aria-hidden="true" />
</button>
```

### Link

```tsx
// External links: indicate they open a new window
<a href={url} target="_blank" rel="noopener noreferrer">
  Documentation <span className="sr-only">(opens in new tab)</span>
</a>
```

### Dialog

```tsx
<dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descId}>
  <h2 id={titleId}>Confirm Deletion</h2>
  <p id={descId}>This action cannot be undone.</p>
  <button onClick={onConfirm}>Delete</button>
  <button onClick={onCancel}>Cancel</button>
</dialog>
```

### Combobox

```tsx
<div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-owns={listboxId}>
  <input
    aria-autocomplete="list"
    aria-controls={listboxId}
    aria-activedescendant={activeOptionId}
  />
</div>
<ul id={listboxId} role="listbox">
  <li id="opt-1" role="option" aria-selected={selected === 'opt-1'}>Option 1</li>
</ul>
```

### Tabs

```tsx
<div role="tablist" aria-label="Settings">
  <button role="tab" id="tab-1" aria-selected={active === 0} aria-controls="panel-1">General</button>
  <button role="tab" id="tab-2" aria-selected={active === 1} aria-controls="panel-2">Privacy</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">{/* content */}</div>
```

### Accordion

```tsx
<h3>
  <button aria-expanded={isOpen} aria-controls={panelId}>
    Section Title
  </button>
</h3>
<div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen}>
  {content}
</div>
```

### Menu

```tsx
<button aria-haspopup="true" aria-expanded={isOpen} aria-controls={menuId}>Actions</button>
<ul id={menuId} role="menu">
  <li role="menuitem" tabIndex={-1}>Edit</li>
  <li role="menuitem" tabIndex={-1}>Delete</li>
  <li role="separator" />
  <li role="menuitem" tabIndex={-1}>Archive</li>
</ul>
```

### Tooltip

```tsx
<button aria-describedby={tooltipId}>Info</button>
<div id={tooltipId} role="tooltip">Additional context here</div>
```

### Alert and Live Regions

```tsx
// Assertive: interrupts screen reader (errors, urgent messages)
<div role="alert">Form submission failed. Please check the highlighted fields.</div>

// Polite: announced at next pause (status updates, toasts)
<div role="status" aria-live="polite">3 items saved.</div>

// Log: append-only (chat, activity feed)
<div role="log" aria-live="polite">{messages.map(m => <p key={m.id}>{m.text}</p>)}</div>
```

---

## Keyboard Interaction Patterns

Per WAI-ARIA Authoring Practices Guide (APG):

| Pattern | Keys | Behavior |
|---------|------|----------|
| Button | `Enter`, `Space` | Activate |
| Link | `Enter` | Follow |
| Tabs | `ArrowLeft`, `ArrowRight` | Move between tabs |
| Tabs | `Home`, `End` | First/last tab |
| Menu | `ArrowUp`, `ArrowDown` | Move between items |
| Menu | `Enter`, `Space` | Activate item |
| Menu | `Escape` | Close, return focus to trigger |
| Combobox | `ArrowDown` | Open popup / next option |
| Combobox | `Enter` | Select current option |
| Combobox | `Escape` | Close popup |
| Dialog | `Escape` | Close dialog |
| Dialog | `Tab` | Cycle within focus trap |
| Accordion | `Enter`, `Space` | Toggle section |
| Accordion | `ArrowUp`, `ArrowDown` | Move between headers |
| Listbox | `ArrowUp`, `ArrowDown` | Move selection |
| Listbox | `Space` | Toggle selection (multi-select) |

### roving tabindex Pattern

Only one item in a group receives `tabIndex={0}`. All others get `tabIndex={-1}`. Arrow keys move the `0` between items.

```tsx
{items.map((item, i) => (
  <button
    key={item.id}
    role="tab"
    tabIndex={i === activeIndex ? 0 : -1}
    onKeyDown={(e) => handleArrowKeys(e, i)}
  >
    {item.label}
  </button>
))}
```

---

## Focus Management

### Focus Trap (Dialogs, Modals)

Constrain Tab cycling to the dialog. On close, restore focus to the trigger element.

```tsx
function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const focusable = ref.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    first?.focus();
    ref.current.addEventListener('keydown', handleKeyDown);
    return () => ref.current?.removeEventListener('keydown', handleKeyDown);
  }, [ref, active]);
}
```

### Focus Restoration

Save the trigger element before opening an overlay. Restore focus when the overlay closes.

```tsx
const triggerRef = useRef<HTMLElement | null>(null);

function openDialog() {
  triggerRef.current = document.activeElement as HTMLElement;
  setOpen(true);
}

function closeDialog() {
  setOpen(false);
  triggerRef.current?.focus();
}
```

### Skip Link

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50">
  Skip to main content
</a>
```

---

## Color and Contrast

### Requirements

| Content Type | Minimum Ratio |
|-------------|---------------|
| Normal text (< 18px / < 14px bold) | 4.5:1 |
| Large text (>= 18px / >= 14px bold) | 3:1 |
| UI components, graphical objects | 3:1 |
| Focus indicators | 3:1 against adjacent colors |

### Common Failures

- Placeholder text with insufficient contrast (common: `#999` on `#fff` = 2.8:1, fails)
- Disabled states are exempt from contrast requirements, but still benefit from legibility
- Links distinguished only by color (add underline or other visual cue)

---

## Motion and prefers-reduced-motion

```css
.panel-enter {
  animation: slide-in 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .panel-enter {
    animation: none;
  }
}
```

```tsx
// JS detection for imperative animations
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}
```

When reduced motion is active: remove decorative animation, collapse transitions to instant, keep functional motion that conveys state (but simplify it).

---

## Screen Reader Considerations

### Visually Hidden Text

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### `aria-hidden` vs Visually Hidden

- `aria-hidden="true"`: removes from accessibility tree, still visible. Use for decorative icons.
- `.sr-only`: removes visually, still in accessibility tree. Use for descriptive text.
- `display: none` / `hidden`: removes from both. Use for truly hidden content.

### Testing Checklist

- Tab through all interactive elements. Verify focus order matches visual order.
- Activate every control with keyboard only (Enter, Space, arrows).
- Turn on VoiceOver (macOS) or NVDA (Windows). Navigate the component. Verify names, roles, and state changes are announced.
- Check that dynamic content changes (toasts, errors, live regions) are announced.
- Verify no content is announced twice (duplicate labels, redundant aria-label + visible text).
