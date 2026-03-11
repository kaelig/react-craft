# Code Writer Reference

Patterns and conventions for each styling method, React version, and common component concerns.

---

## Tailwind Patterns

### Variant Maps with clsx

Use plain objects to map variant values to class strings. Combine with `clsx` (or `clsx/lite`) for conditional composition.

```tsx
const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-hover',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
} as const satisfies Record<string, string>;

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
} as const satisfies Record<string, string>;

function Button({ variant, size = 'md', disabled, className, children }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}
```

### Responsive Utilities

Mobile-first: base classes apply at the smallest breakpoint, prefix for larger.

```tsx
<div className="flex flex-col gap-4 md:flex-row md:gap-6 lg:gap-8">
  <aside className="w-full md:w-64 lg:w-80">...</aside>
  <main className="flex-1">...</main>
</div>
```

### Tailwind Token Consumption

Reference the project's Tailwind theme instead of hardcoded values:

```tsx
// Correct: uses theme tokens
<p className="text-foreground bg-surface p-4 rounded-lg" />

// Wrong: hardcoded values
<p className="text-[#333] bg-[#fff] p-[16px] rounded-[8px]" />
```

When the design specifies a value not in the theme, add a comment explaining why a one-off value is necessary:

```tsx
{/* One-off: design spec calls for 18px icon at this breakpoint */}
<svg className="size-[18px]" />
```

---

## CSS Modules Patterns

### Basic Component

```tsx
import styles from './Alert.module.css';

function Alert({ variant, children }: AlertProps) {
  return (
    <div className={`${styles.root} ${styles[variant]}`} role="alert">
      {children}
    </div>
  );
}
```

### CSS Custom Properties for Tokens

```css
/* Alert.module.css */
.root {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.info {
  background-color: var(--color-info-surface);
  color: var(--color-info-text);
  border: 1px solid var(--color-info-border);
}

.error {
  background-color: var(--color-error-surface);
  color: var(--color-error-text);
  border: 1px solid var(--color-error-border);
}
```

### Composition

Use `composes` for shared base styles within the same file:

```css
.base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-medium);
}

.primary {
  composes: base;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.secondary {
  composes: base;
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
}
```

### :global for Third-Party Integration

```css
.root :global(.external-lib-class) {
  margin: 0;
}
```

---

## styled-components Patterns

### Theme Access

```tsx
import styled from 'styled-components';

const Card = styled.div`
  padding: ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radius.md};
  background-color: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.foreground};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;
```

### Dynamic Props with Transient Props

Use the `$` prefix for props that should not be forwarded to the DOM:

```tsx
interface StyledBadgeProps {
  readonly $variant: 'success' | 'warning' | 'error';
  readonly $size: 'sm' | 'md';
}

const Badge = styled.span<StyledBadgeProps>`
  display: inline-flex;
  align-items: center;
  padding: ${({ $size, theme }) => ($size === 'sm' ? theme.space[1] : theme.space[2])};
  font-size: ${({ $size, theme }) => ($size === 'sm' ? theme.text.xs : theme.text.sm)};
  background-color: ${({ $variant, theme }) => theme.colors[$variant].surface};
  color: ${({ $variant, theme }) => theme.colors[$variant].text};
  border-radius: ${({ theme }) => theme.radius.full};
`;
```

### Extending Styles

```tsx
const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const PrimaryButton = styled(BaseButton)`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryHover};
  }
`;
```

---

## React 18 vs 19 Ref Patterns

### React 18: forwardRef

```tsx
import { forwardRef } from 'react';
import type { ReactNode } from 'react';

interface InputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, value, onChange }, ref) {
    return (
      <label>
        <span>{label}</span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
);

export { Input };
export type { InputProps };
```

### React 19+: ref as a Regular Prop

```tsx
import type { ReactNode, Ref } from 'react';

interface InputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly ref?: Ref<HTMLInputElement>;
}

function Input({ label, value, onChange, ref }: InputProps) {
  return (
    <label>
      <span>{label}</span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export { Input };
export type { InputProps };
```

---

## Barrel Export Patterns

Every component directory gets an `index.ts` that re-exports the public API.

### Single Component

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

### Compound Component

```ts
export { Tabs } from './Tabs';
export { TabList } from './TabList';
export { Tab } from './Tab';
export { TabPanel } from './TabPanel';
export type { TabsProps } from './Tabs';
export type { TabListProps } from './TabList';
export type { TabProps } from './Tab';
export type { TabPanelProps } from './TabPanel';
```

### With verbatimModuleSyntax

When the project has `verbatimModuleSyntax` enabled, the `export type` syntax is mandatory for type-only re-exports. The patterns above already satisfy this. Do not mix value and type exports on the same line:

```ts
// Correct
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Wrong: mixed export
export { Button, type ButtonProps } from './Button';
```

---

## Motion and Animation

### prefers-reduced-motion

Every animation or transition must respect the user's motion preference.

#### CSS approach (preferred)

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

#### Tailwind approach

```tsx
<div className="motion-safe:animate-fade-in motion-reduce:animate-none" />

<button className="motion-safe:transition-all motion-reduce:transition-none" />
```

#### JavaScript approach (for imperative animation)

```tsx
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
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

When `prefers-reduced-motion: reduce` is active:
- Remove decorative animations entirely
- Collapse transitions to instant or near-instant (under 100ms)
- Keep functional motion that conveys state changes, but simplify it

---

## Responsive Patterns

### Mobile-First Media Queries

Start with the smallest screen. Add complexity as space increases.

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Container Queries

Use container queries when a component's layout depends on its own width rather than the viewport.

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card {
  display: flex;
  flex-direction: column;
}

@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }
}
```

In Tailwind (v3.2+):

```tsx
<div className="@container">
  <div className="flex flex-col @md:flex-row @md:items-center">
    ...
  </div>
</div>
```

---

## Token Consumption by Method

The design system provides tokens. Each styling method consumes them differently.

| Token Layer | CSS Custom Properties | Tailwind Theme | styled-components Theme |
|---|---|---|---|
| Color | `var(--color-primary)` | `text-primary`, `bg-primary` | `theme.colors.primary` |
| Spacing | `var(--space-4)` | `p-4`, `gap-4` | `theme.space[4]` |
| Typography | `var(--text-sm)` | `text-sm` | `theme.text.sm` |
| Radius | `var(--radius-md)` | `rounded-md` | `theme.radius.md` |
| Shadow | `var(--shadow-sm)` | `shadow-sm` | `theme.shadows.sm` |
| Breakpoint | `@media (min-width: var(--bp-md))` | `md:` prefix | `theme.breakpoints.md` |

### CSS Custom Properties as the Universal Layer

Regardless of styling method, CSS custom properties should be the underlying source of truth. This enables:
- Runtime theming (dark mode, brand switching)
- Design tool integration (tokens map directly to properties)
- Debugging in browser DevTools

Tailwind themes and styled-components themes should both reference the same CSS custom properties under the hood:

```css
/* tokens.css -- the single source */
:root {
  --color-primary: oklch(0.55 0.2 260);
  --color-on-primary: oklch(0.98 0 0);
  --space-4: 1rem;
  --radius-md: 0.5rem;
}
```

```js
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      primary: 'var(--color-primary)',
      'on-primary': 'var(--color-on-primary)',
    },
  },
};
```

```js
// styled-components theme
const theme = {
  colors: {
    primary: 'var(--color-primary)',
    onPrimary: 'var(--color-on-primary)',
  },
};
```
