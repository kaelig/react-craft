# Component API Design Reference

> Last updated: 2026-03. Verify against Context7 when available.

Patterns for designing type-safe, ergonomic React component APIs.

---

## Table of Contents

- [Polymorphic as Prop](#polymorphic-as-prop)
- [forwardRef with Generics](#forwardref-with-generics)
- [Discriminated Unions vs Boolean Flags](#discriminated-unions-vs-boolean-flags)
- [Compound Component Patterns](#compound-component-patterns)
- [Event Handler Typing](#event-handler-typing)
- [Prop Naming Conventions](#prop-naming-conventions)
- [Progressive Disclosure](#progressive-disclosure)
- [Generic Component Patterns](#generic-component-patterns)

---

## Polymorphic as Prop

Allows consumers to render a component as any HTML element or custom component while preserving type safety.

### Type Helper

```tsx
type PolymorphicProps<E extends React.ElementType, P = object> = P &
  Omit<React.ComponentPropsWithoutRef<E>, keyof P> & {
    readonly as?: E;
  };
```

### Usage

```tsx
type TextProps<E extends React.ElementType = 'span'> = PolymorphicProps<E, {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly weight?: 'normal' | 'medium' | 'bold';
}>;

function Text<E extends React.ElementType = 'span'>({
  as,
  size = 'md',
  weight = 'normal',
  className,
  ...props
}: TextProps<E>) {
  const Component = as ?? 'span';
  return (
    <Component
      className={clsx(styles.text, styles[size], styles[weight], className)}
      {...props}
    />
  );
}
```

### Consumer Usage

```tsx
<Text>Default span</Text>
<Text as="p" size="lg">Paragraph</Text>
<Text as="h2" weight="bold">Heading</Text>
<Text as={Link} href="/about">Router link</Text>
```

TypeScript infers the correct props for each `as` value. Passing `href` when `as="span"` produces a type error.

### When to Use

- Typography components (`Text`, `Heading`)
- Layout primitives (`Box`, `Stack`, `Flex`)
- Interactive wrappers that may be buttons or links

### When to Avoid

- Components with a fixed semantic meaning (`Dialog`, `Table`)
- Components where changing the element breaks functionality

---

## forwardRef with Generics

React 18's `forwardRef` erases generic type parameters. Work around it with a type assertion.

```tsx
interface ListProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T) => ReactNode;
}

function ListInner<T>(
  { items, renderItem }: ListProps<T>,
  ref: React.ForwardedRef<HTMLUListElement>,
) {
  return (
    <ul ref={ref}>
      {items.map((item, i) => (
        <li key={i}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

const List = forwardRef(ListInner) as <T>(
  props: ListProps<T> & { ref?: React.Ref<HTMLUListElement> },
) => ReactElement;
```

In React 19, this workaround is unnecessary because `ref` is a regular prop.

---

## Discriminated Unions vs Boolean Flags

### Boolean Flags

Use when a feature is a simple on/off toggle with no associated data.

```tsx
interface ChipProps {
  readonly label: string;
  readonly removable?: boolean;
  readonly onRemove?: () => void;
}
```

Acceptable: `removable` is a single toggle.

### Discriminated Unions

Use when variants have different props, behaviors, or required fields. This prevents impossible states.

```tsx
// Bad: boolean flags create impossible states
interface ButtonProps {
  readonly isLink?: boolean;
  readonly href?: string;        // only valid when isLink
  readonly onClick?: () => void; // only valid when !isLink
  readonly type?: 'button' | 'submit'; // only valid when !isLink
}

// Good: discriminated union makes each variant self-contained
type ButtonProps =
  | {
      readonly as?: 'button';
      readonly type?: 'button' | 'submit' | 'reset';
      readonly onClick?: React.MouseEventHandler<HTMLButtonElement>;
    }
  | {
      readonly as: 'a';
      readonly href: string;
      readonly target?: '_blank' | '_self';
    };
```

### Decision Guide

| Scenario | Prefer |
|----------|--------|
| Simple toggle (dismissible, loading, disabled) | Boolean flag |
| Two+ variants with different required props | Discriminated union |
| Variant changes the rendered element | Discriminated union |
| Variant changes available event handlers | Discriminated union |
| Feature is optional and self-contained | Boolean flag |

---

## Compound Component Patterns

Use when child components share implicit state and must be composed together.

### Context-Based

```tsx
interface SelectContextValue {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(): SelectContextValue {
  const ctx = use(SelectContext);
  if (!ctx) throw new Error('Select.* components must be used within <Select>');
  return ctx;
}

function Select({ value, onChange, children }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ctx = useMemo(() => ({ value, onChange, open, setOpen }), [value, onChange, open]);
  return <SelectContext value={ctx}>{children}</SelectContext>;
}

function Trigger({ children }: { children: ReactNode }) {
  const { open, setOpen } = useSelectContext();
  return (
    <button
      role="combobox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

function Option({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useSelectContext();
  return (
    <li
      role="option"
      aria-selected={ctx.value === value}
      onClick={() => { ctx.onChange(value); ctx.setOpen(false); }}
    >
      {children}
    </li>
  );
}

// Attach sub-components
Select.Trigger = Trigger;
Select.Option = Option;
```

### Consumer Usage

```tsx
<Select value={country} onChange={setCountry}>
  <Select.Trigger>Choose country</Select.Trigger>
  <Select.Option value="us">United States</Select.Option>
  <Select.Option value="ca">Canada</Select.Option>
  <Select.Option value="mx">Mexico</Select.Option>
</Select>
```

---

## Event Handler Typing

### Standard Handler Types

```tsx
interface FormFieldProps {
  readonly onClick?: React.MouseEventHandler<HTMLButtonElement>;
  readonly onChange?: React.ChangeEventHandler<HTMLInputElement>;
  readonly onFocus?: React.FocusEventHandler<HTMLInputElement>;
  readonly onBlur?: React.FocusEventHandler<HTMLInputElement>;
  readonly onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  readonly onSubmit?: React.FormEventHandler<HTMLFormElement>;
}
```

### Custom Event Callbacks

When the component transforms the event, expose a semantic callback instead of a raw DOM event.

```tsx
interface SliderProps {
  // Semantic: consumer gets the value, not the event
  readonly onValueChange?: (value: number) => void;

  // Raw: consumer needs event for things like preventDefault
  readonly onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}
```

### Pattern: Merge Event Handlers

When the component needs its own handler but must also call the consumer's handler:

```tsx
function mergeHandlers<E>(
  internal: React.EventHandler<E>,
  external?: React.EventHandler<E>,
): React.EventHandler<E> {
  return (event) => {
    internal(event);
    external?.(event);
  };
}

// Usage
<button
  onClick={mergeHandlers(handleToggle, props.onClick)}
/>
```

---

## Prop Naming Conventions

| Pattern | Convention | Examples |
|---------|-----------|----------|
| Event handlers | `on` + noun + verb | `onClick`, `onValueChange`, `onOpenChange` |
| Boolean state | `is` / `has` prefix | `isOpen`, `isDisabled`, `hasError`, `isLoading` |
| Boolean features | adjective or `able` suffix | `dismissible`, `sortable`, `collapsible` |
| Ref forwarding | `*Ref` suffix for extra refs | `triggerRef`, `contentRef` (primary ref is just `ref`) |
| Render delegation | `render` prefix | `renderItem`, `renderEmpty`, `renderHeader` |
| Slot content | noun | `icon`, `label`, `description`, `header`, `footer` |
| Size / variant | noun | `size`, `variant`, `color`, `orientation` |

### HTML Attribute Passthrough

Spread remaining props onto the root element. Always type the component to accept native HTML attributes.

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly variant?: 'elevated' | 'outlined';
}

function Card({ variant = 'outlined', className, ...props }: CardProps) {
  return <div className={clsx(styles[variant], className)} {...props} />;
}
```

---

## Progressive Disclosure

Design APIs with minimal required props. Make enhancement optional.

### Minimal Required Props

```tsx
// Good: works with just children
<Button>Save</Button>

// Enhancement: optional props add features
<Button variant="primary" size="lg" icon={<SaveIcon />} loading>
  Save
</Button>
```

### Tier Pattern

```tsx
interface AlertProps {
  // Tier 1: Required (component is usable)
  readonly children: ReactNode;

  // Tier 2: Common (frequently customized)
  readonly variant?: 'info' | 'success' | 'warning' | 'error';
  readonly dismissible?: boolean;

  // Tier 3: Advanced (power-user features)
  readonly onDismiss?: () => void;
  readonly icon?: ReactNode;
  readonly actions?: ReactNode;
}
```

### Default Values

Set smart defaults so the zero-config usage is the most common use case.

```tsx
function Alert({
  children,
  variant = 'info',       // sensible default
  dismissible = false,    // opt-in feature
  onDismiss,
}: AlertProps) {
  // ...
}
```

---

## Generic Component Patterns

### Single Generic, Constrained

Limit to one generic parameter. Constrain it with `extends`.

```tsx
interface SelectProps<T extends string> {
  readonly options: readonly T[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

function Select<T extends string>({ options, value, onChange }: SelectProps<T>) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
```

Consumer gets type-safe values:

```tsx
type Color = 'red' | 'green' | 'blue';

// onChange receives Color, not string
<Select<Color> options={['red', 'green', 'blue']} value="red" onChange={handleColor} />
```

### Object Generics with Key Extraction

```tsx
interface DataTableProps<T extends Record<string, unknown>> {
  readonly data: readonly T[];
  readonly columns: readonly {
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], row: T) => ReactNode;
  }[];
}

function DataTable<T extends Record<string, unknown>>({ data, columns }: DataTableProps<T>) {
  return (
    <table>
      <thead>
        <tr>{columns.map((col) => <th key={String(col.key)}>{col.header}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={String(col.key)}>
                {col.render ? col.render(row[col.key], row) : String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### When to Avoid Generics

- The component does not need to preserve or expose the type to the consumer
- The generic adds complexity without enabling new type-safe patterns
- Two or more generics are needed (rethink the API, split into separate components)
