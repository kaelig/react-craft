# Component Architect Reference

Patterns and guidelines for designing React component APIs. Every example follows the project's shared values: semantic HTML first, accessibility is not optional, simplicity over sophistication.

---

## Discriminated Union Patterns

Use discriminated unions when variants carry different associated data. This eliminates impossible states at the type level.

### Basic: Simple Variant Union

When all variants share the same props, a simple string union is enough:

```typescript
interface ButtonProps {
  readonly variant: 'primary' | 'secondary' | 'ghost';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly disabled?: boolean;
  readonly children: React.ReactNode;
}
```

### Advanced: Variants with Associated Data

When different variants need different props, use a discriminated union to make impossible states unrepresentable:

```typescript
type AlertProps = Readonly<
  | {
      /** Informational alert — no action required. */
      variant: 'info';
      children: React.ReactNode;
    }
  | {
      /** Confirmation alert with a required action. */
      variant: 'confirmation';
      children: React.ReactNode;
      onConfirm: () => void;
      confirmLabel: string;
    }
  | {
      /** Destructive alert with required confirm and cancel. */
      variant: 'destructive';
      children: React.ReactNode;
      onConfirm: () => void;
      onCancel: () => void;
      confirmLabel: string;
      cancelLabel: string;
    }
>;
```

This prevents passing `onConfirm` to an `info` alert or forgetting `onCancel` on a `destructive` alert.

### When to Reach for Discriminated Unions

- Two or more variants require **different callback signatures**
- A variant adds **required fields** that other variants do not have
- You find yourself writing prop comments like "only used when variant is X"

### When NOT to Use Them

- All variants share the exact same props (use a simple string union)
- The difference is purely visual (use CSS/tokens, not types)

---

## Compound Component Patterns

Use compound components when a component has multiple composable slots that the consumer should control.

### Context-Based (Recommended)

Share state through React Context. This is the most flexible pattern — it does not care about DOM nesting depth.

```typescript
// --- SelectContext.ts ---
type SelectContextValue<T> = {
  value: T | null;
  onChange: (value: T) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = createContext<SelectContextValue<unknown> | null>(null);

function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error('Select compound components must be used within <Select>');
  }
  return ctx;
}

// --- Select.tsx ---
function Select<T>({ value, onChange, children }: SelectRootProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <SelectContext value={{ value, onChange, open, setOpen }}>
      <div role="listbox">{children}</div>
    </SelectContext>
  );
}

// --- SelectOption.tsx ---
function SelectOption<T>({ value, children }: SelectOptionProps<T>) {
  const { onChange, value: selected } = useSelectContext();
  return (
    <button
      role="option"
      aria-selected={value === selected}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
}

// --- Attach sub-components ---
Select.Option = SelectOption;
```

Usage:

```tsx
<Select value={selected} onChange={setSelected}>
  <Select.Option value="a">Alpha</Select.Option>
  <Select.Option value="b">Beta</Select.Option>
</Select>
```

### React.Children-Based (Avoid in Most Cases)

Iterates over `children` with `React.Children.map` and injects props via `cloneElement`. This breaks when consumers wrap children in fragments or intermediate components. Only use when you need strict ordering guarantees (e.g., `Stepper` where step index matters).

### When to Use Compound Components

- The component has **named slots** (header, body, footer)
- Consumers need to **reorder, omit, or repeat** children
- Internal state (open/closed, selected value) must be shared across parts

### When NOT to Use Them

- A simple `children` prop is enough
- The component has a fixed, non-negotiable structure (use regular props)

---

## Polymorphic Component Pattern

Allow consumers to change the rendered HTML element while keeping type safety. Use sparingly — most components should render a single semantic element.

```typescript
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as'>;

function Text<E extends React.ElementType = 'span'>({
  as,
  ...props
}: PolymorphicProps<E>) {
  const Component = as ?? 'span';
  // The single allowed `as` assertion — at the render boundary
  return <Component {...(props as Record<string, unknown>)} />;
}
```

Usage:

```tsx
<Text>Inline text</Text>               {/* renders <span> */}
<Text as="p">Paragraph text</Text>     {/* renders <p> */}
<Text as="label" htmlFor="name">…</Text> {/* renders <label>, htmlFor is type-safe */}
```

### Rules

- Default element must be the most semantically common case
- The `as` assertion at the render boundary is the **only** place `as` casts are permitted
- Prefer a fixed element when the component is always one thing (a `<Button>` is always a `<button>`)
- For link-or-button patterns, prefer discriminated unions over polymorphism:

```typescript
type ActionProps = Readonly<
  | { as: 'button'; onClick: () => void }
  | { as: 'a'; href: string }
>;
```

---

## When to Use Generics vs Simple Types

### Use Generics When

The component operates on **user-defined data shapes**:

```typescript
// The consumer defines what T looks like
type ListProps<T extends { id: string }> = Readonly<{
  items: readonly T[];
  renderItem: (item: T) => React.ReactNode;
  onSelect?: (item: T) => void;
}>;
```

Rules for generics:

- Max **1 generic parameter** per component
- Always **constrain** with `extends` — never `<T>` alone
- The generic must appear in at least 2 prop positions (otherwise it adds no value)

### Use Simple Types When

The component works with a **known, fixed** set of values:

```typescript
// No generic needed — the badge always uses these variants
interface BadgeProps {
  readonly variant: 'info' | 'success' | 'warning' | 'error';
  readonly children: React.ReactNode;
}
```

If you find yourself writing `<T>` but the type is only used once, remove the generic and use the concrete type.

---

## Library Comparison

For complex interactive components (selects, dialogs, date pickers, comboboxes, tooltips), prefer a headless library over building from scratch.

| Criteria | Radix UI | React Aria | Headless UI |
|---|---|---|---|
| **Philosophy** | Unstyled primitives with optional styling | Hooks-first, spec-compliant | Tailwind-first unstyled components |
| **a11y depth** | Good — covers common patterns | Excellent — follows WAI-ARIA spec precisely | Good — covers common patterns |
| **Bundle size** | Small per-component imports | Larger — ships full interaction model | Small |
| **Styling freedom** | Full — renders plain DOM | Full — returns props, you render | Full — renders plain DOM |
| **React 19 support** | Active development | Active development | Slower update cadence |
| **Best for** | Design systems that want composable primitives | Apps needing deep a11y compliance | Tailwind-heavy projects |

### Recommendation Order

1. **React Aria** when accessibility compliance is the top priority or for complex widgets (date pickers, grids)
2. **Radix** when you want composable primitives with good defaults and a smaller API surface
3. **Headless UI** when the project already uses Tailwind and needs basic interactive components
4. **Custom** only when no library covers the pattern or when the component is simple enough that a library adds unnecessary weight

Always check `banned_dependencies` in `react-craft.config.yaml` before recommending.

---

## API Design Principles

### 1. Smallest Possible API Surface

Every prop is a maintenance commitment. Before adding a prop, ask:

- Can this be handled with CSS/tokens instead?
- Can the consumer achieve this with `children` or composition?
- Will more than 20% of consumers use this prop?

If the answer to any is no, leave it out. It can always be added later; it cannot be removed without a breaking change.

### 2. Progressive Disclosure

The simplest usage should require the fewest props. Advanced features should be opt-in:

```tsx
{/* Simple — works with zero config */}
<DatePicker value={date} onChange={setDate} />

{/* Advanced — opt into complexity */}
<DatePicker
  value={date}
  onChange={setDate}
  min={startOfYear}
  max={endOfYear}
  disabledDates={holidays}
  locale="fr-FR"
/>
```

### 3. Consistent Naming Conventions

| Pattern | Convention | Example |
|---|---|---|
| Event callbacks | `on` + event name | `onChange`, `onSelect`, `onDismiss` |
| Boolean states | Adjective (no `is` prefix) | `disabled`, `loading`, `open` |
| Render customization | `render` + noun | `renderItem`, `renderEmpty` |
| Slot content | Noun | `header`, `footer`, `icon` |
| Size/variant | String union | `size: 'sm' \| 'md'` |

### 4. Prefer Composition Over Configuration

Instead of:

```tsx
<Card
  title="Hello"
  subtitle="World"
  headerAction={<Button>Edit</Button>}
  footer={<Link>Read more</Link>}
/>
```

Prefer:

```tsx
<Card>
  <Card.Header>
    <Card.Title>Hello</Card.Title>
    <Card.Subtitle>World</Card.Subtitle>
    <Button>Edit</Button>
  </Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>
    <Link>Read more</Link>
  </Card.Footer>
</Card>
```

The compositional version is more flexible, easier to extend, and does not require a new prop for every layout variation.

### 5. No Prop Drilling — Use Context

When a parent component needs to share state with deeply nested children, use React Context (see Compound Component Patterns above). Never force consumers to pass the same prop to multiple sub-components.
