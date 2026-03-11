# Motion & Animation Reference

> Last updated: 2026-03. Verify against Context7 when available.

Functional animation patterns for component development.

---

## Table of Contents

- [When to Animate](#when-to-animate)
- [prefers-reduced-motion](#prefers-reduced-motion)
- [CSS Transitions vs Animations vs JS](#css-transitions-vs-animations-vs-js)
- [Common Animation Patterns](#common-animation-patterns)
- [Duration Guidelines](#duration-guidelines)
- [Easing Functions](#easing-functions)

---

## When to Animate

### Animate (Functional Motion)

| Purpose | Example | Why |
|---------|---------|-----|
| State transitions | Button hover, toggle on/off | Confirms the action happened |
| Feedback | Form validation shake, success checkmark | Communicates result to user |
| Orientation | Page transition, accordion expand | Shows spatial relationship |
| Attention | Toast appearing, new badge count | Directs focus to new information |
| Continuity | Shared element transition, list reorder | Maintains mental model of layout |

### Do Not Animate (Decorative Motion)

| Anti-pattern | Why |
|--------------|-----|
| Looping background animations | Distracting, no information conveyed |
| Parallax scrolling on content | Causes motion sickness for some users |
| Bouncing "click me" elements | Annoying, creates urgency without value |
| Animated gradients as decoration | Battery drain, no semantic purpose |
| Entry animations on every page load | Slows perception of readiness |

Rule of thumb: if removing the animation loses no information, it is decorative. Skip it or gate it behind `prefers-reduced-motion: no-preference`.

---

## prefers-reduced-motion

Every animation must respect this preference. No exceptions.

### CSS Approach (Preferred)

```css
.panel {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
  }
}
```

Alternatively, opt-in only when motion is preferred:

```css
.panel {
  /* No transition by default */
}

@media (prefers-reduced-motion: no-preference) {
  .panel {
    transition: transform 200ms ease-out, opacity 200ms ease-out;
  }
}
```

The opt-in approach is safer: motion is off by default, enabled only when the user has not restricted it.

### Tailwind Approach

```tsx
{/* motion-safe: only applied when user has no motion preference */}
<div className="motion-safe:animate-fade-in motion-reduce:animate-none" />

{/* Transitions */}
<button className="motion-safe:transition-colors motion-safe:duration-150" />
```

### JavaScript Approach

For imperative animations (Web Animations API, GSAP, Framer Motion).

```tsx
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

// Usage
function Toast({ message, onDismiss }: ToastProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.animate(
      [
        { transform: 'translateY(100%)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: reduced ? 0 : 200, easing: 'ease-out', fill: 'forwards' },
    );
  }, [reduced]);

  return <div ref={ref} role="status">{message}</div>;
}
```

### What to Do Under Reduced Motion

| Normal Behavior | Reduced Motion Alternative |
|----------------|---------------------------|
| Slide in from edge | Instant appear (opacity 0 to 1 at 0ms) |
| Expand/collapse with height transition | Instant show/hide |
| Multi-step sequence animation | Single-step instant change |
| Decorative loader spin | Static progress indicator |
| Page transition slide | Cut transition (no interpolation) |

---

## CSS Transitions vs Animations vs JS

### CSS Transitions

Best for: state changes between two known states (hover, focus, open/closed).

```css
.button {
  background-color: var(--color-primary);
  transition: background-color 150ms ease-out;
}

.button:hover {
  background-color: var(--color-primary-hover);
}
```

Limitations: only interpolates between start and end. No keyframes, no sequencing.

### CSS Animations

Best for: multi-step sequences, entry/exit animations, looping indicators.

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.toast-enter {
  animation: fade-in 200ms ease-out forwards;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 800ms linear infinite;
}
```

Limitations: cannot dynamically change target values. Hard to coordinate multiple elements.

### JavaScript Animations (Web Animations API)

Best for: dynamic values, coordinated multi-element sequences, gesture-driven animation.

```tsx
function animateCollapse(el: HTMLElement, reduced: boolean) {
  const height = el.scrollHeight;
  return el.animate(
    [
      { height: `${height}px`, opacity: 1 },
      { height: '0px', opacity: 0 },
    ],
    {
      duration: reduced ? 0 : 250,
      easing: 'ease-in',
      fill: 'forwards',
    },
  );
}
```

### Decision Matrix

| Requirement | Use |
|-------------|-----|
| Two states, CSS properties | CSS transition |
| Multi-step or entry animation | CSS `@keyframes` |
| Dynamic end values | JS (Web Animations API) |
| Gesture-driven (drag, swipe) | JS (requestAnimationFrame or library) |
| Spring physics | JS library (Framer Motion, React Spring) |

---

## Common Animation Patterns

### Enter / Exit

```css
/* Enter */
@keyframes enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Exit */
@keyframes exit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

.dialog[open] {
  animation: enter 200ms ease-out;
}

.dialog.closing {
  animation: exit 150ms ease-in forwards;
}
```

### Expand / Collapse

Using `grid` for animatable height:

```css
.collapsible {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms ease-out;
}

.collapsible.open {
  grid-template-rows: 1fr;
}

.collapsible-inner {
  overflow: hidden;
}
```

### Slide

```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
```

### Fade

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

### Scale (Popover, Menu)

```css
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.popover[open] {
  animation: scale-in 150ms ease-out;
  transform-origin: var(--popover-origin, top left);
}
```

### Skeleton Pulse

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  background-color: var(--color-muted);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    opacity: 0.7;
  }
}
```

---

## Duration Guidelines

| Category | Duration | Examples |
|----------|----------|---------|
| Micro-interactions | 100-150ms | Button hover, toggle, ripple |
| Simple transitions | 150-250ms | Tooltip show, fade in/out, color change |
| Medium transitions | 250-350ms | Dialog open, accordion expand, slide panel |
| Complex transitions | 350-500ms | Page transition, multi-element sequence |

### Rules

- **Under 100ms** feels instant (good for hover feedback)
- **100-300ms** feels responsive (most UI transitions)
- **300-500ms** feels deliberate (use sparingly for complex motion)
- **Over 500ms** feels sluggish (avoid for UI, acceptable for loading indicators)
- Exit animations should be faster than entry (users want to move forward)

---

## Easing Functions

### Standard Easings

| Easing | CSS Value | Use When |
|--------|-----------|----------|
| ease-out | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the viewport |
| ease-in | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the viewport |
| ease-in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | Elements moving within viewport |
| linear | `linear` | Continuous animations (spinners, progress) |

### Why ease-out for enter, ease-in for exit

- **Entering**: Element starts fast (appears quickly) and decelerates to rest. User perceives it arriving.
- **Exiting**: Element starts slow (visible goodbye) and accelerates away. User perceives it leaving.

### CSS Custom Properties for Consistent Easing

```css
:root {
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Spring-Like Easing

For playful UI (toggles, draggable elements), a slight overshoot feels natural.

```css
.toggle-thumb {
  transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toggle[aria-checked='true'] .toggle-thumb {
  transform: translateX(20px);
}
```

Use spring easing only when the element has a physical metaphor (sliding, bouncing). Never for text or critical UI elements.
