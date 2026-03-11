# React Component Library API Design Best Practices (2025-2026)

Research compiled 2026-03-11. Sources cited inline.

---

## 1. TypeScript Prop Interface Patterns

### 1a. Discriminated Unions for Mutually Exclusive Props

The most important TypeScript pattern for component libraries. When a component has
modes that change which props are valid, encode this in the type system rather than
using runtime checks.

```tsx
// BAD: loose props, no enforcement
type ButtonProps = {
  href?: string;
  onClick?: () => void;
  target?: string;
  type?: "submit" | "reset" | "button";
};

// GOOD: discriminated union enforces valid combinations
type ButtonAsAnchorProps = {
  as: "a";
  href: string;
  target?: string;
  onClick?: never;
  type?: never;
};

type ButtonAsButtonProps = {
  as?: "button";
  href?: never;
  target?: never;
  onClick?: () => void;
  type?: "submit" | "reset" | "button";
};

type ButtonProps = ButtonAsAnchorProps | ButtonAsButtonProps;

function Button(props: ButtonProps) {
  if (props.as === "a") {
    return <a href={props.href} target={props.target} />;
  }
  return <button type={props.type} onClick={props.onClick} />;
}

// Type error: href is not valid on a button
<Button as="button" href="/foo" />
// Type error: onClick is not valid on an anchor
<Button as="a" href="/foo" onClick={() => {}} />
```

Use `never` for props that should not exist in a given variant. The TypeScript compiler
will reject them at the call site.

### 1b. Polymorphic Components with Generic Constraints

For components that render "as" any element while preserving that element's props:

```tsx
import { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

// Reusable utility types -- extract these to a shared types file
type PolymorphicProps<
  T extends ElementType,
  Props = {},
> = Props & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof Props | "as">;

// Usage in a concrete component
type BoxOwnProps = {
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
};

type BoxProps<T extends ElementType = "div"> = PolymorphicProps<T, BoxOwnProps>;

function Box<T extends ElementType = "div">({
  as,
  padding = "none",
  children,
  ...rest
}: BoxProps<T>) {
  const Component = as || "div";
  return (
    <Component data-padding={padding} {...rest}>
      {children}
    </Component>
  );
}

// Consumers get full type safety:
<Box as="section" aria-label="Content" padding="md" />
// string props from <section> are valid ^

<Box as="a" href="/about" padding="sm" />
// href is valid because as="a" ^

<Box as="button" href="/nope" />
// Type error: href does not exist on button ^
```

### 1c. Generic Components for Data-Driven APIs

When components work with user-defined data shapes (selects, tables, lists):

```tsx
type SelectProps<T> = {
  items: T[];
  value: T | null;
  onChange: (item: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
  disabled?: boolean;
};

function Select<T>({ items, value, onChange, getLabel, getKey }: SelectProps<T>) {
  return (
    <select
      value={value ? getKey(value) : ""}
      onChange={(e) => {
        const selected = items.find((item) => getKey(item) === e.target.value);
        if (selected) onChange(selected);
      }}
    >
      {items.map((item) => (
        <option key={getKey(item)} value={getKey(item)}>
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}

// Usage: T is inferred as { id: string; name: string }
<Select
  items={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getLabel={(u) => u.name}
  getKey={(u) => u.id}
/>
```

---

## 2. Compound Component Patterns

Three approaches, ranked by current consensus:

### 2a. Context-Based Compound Components (Recommended)

Used by Radix, Ariakit, and most modern libraries. Parent owns state, children
consume via context. Works at any nesting depth.

```tsx
import { createContext, useContext, useState, ReactNode } from "react";

// Internal context -- never export this
type AccordionContextValue = {
  openItem: string | null;
  toggle: (id: string) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion.* must be used within <Accordion>");
  return ctx;
}

// Root component owns state
function Accordion({ children }: { children: ReactNode }) {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const toggle = (id: string) =>
    setOpenItem((prev) => (prev === id ? null : id));

  return (
    <AccordionContext.Provider value={{ openItem, toggle }}>
      <div data-accordion="">{children}</div>
    </AccordionContext.Provider>
  );
}

// Item provides its own sub-context for the value
const ItemContext = createContext<string>("");

function AccordionItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <ItemContext.Provider value={value}>
      <div data-accordion-item="">{children}</div>
    </ItemContext.Provider>
  );
}

function AccordionTrigger({ children }: { children: ReactNode }) {
  const { openItem, toggle } = useAccordion();
  const value = useContext(ItemContext);
  const isOpen = openItem === value;

  return (
    <button
      aria-expanded={isOpen}
      onClick={() => toggle(value)}
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
    </button>
  );
}

function AccordionContent({ children }: { children: ReactNode }) {
  const { openItem } = useAccordion();
  const value = useContext(ItemContext);
  const isOpen = openItem === value;

  if (!isOpen) return null;
  return <div data-state="open">{children}</div>;
}

// Attach sub-components
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

// Consumer usage -- any nesting depth works
<Accordion>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Section 1</Accordion.Trigger>
    <Accordion.Content>Content 1</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="item-2">
    <Accordion.Trigger>Section 2</Accordion.Trigger>
    <Accordion.Content>Content 2</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### 2b. Slot-Based Pattern (React Aria Style)

Components declare named slots. Children announce which slot they fill via a
`slot` prop. The parent uses context to route props to the correct slot.

```tsx
// React Aria's approach -- consumers declare intent
import { Dialog, Heading, Button } from "react-aria-components";

<Dialog>
  <Heading slot="title">Settings</Heading>
  <p>Adjust your preferences below.</p>
  <Button slot="close">Done</Button>
</Dialog>
```

Advantages: explicit intent, no positional dependency, works with RSC.
Disadvantage: requires learning the slot vocabulary per component.

### 2c. React.Children Scanning (Discouraged)

Fragile, breaks with wrapper components, incompatible with React Compiler
optimizations. Avoid in new code.

```tsx
// AVOID this pattern in new libraries
function Modal({ children }) {
  const header = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === ModalHeader
  );
  // breaks if consumer wraps ModalHeader in a div, memo, or fragment
}
```

---

## 3. Forward Ref Patterns (React 19+)

### React 19: ref is now a regular prop

forwardRef is deprecated in React 19 (December 2024). ref is destructured like
any other prop. This eliminates wrapper indirection and simplifies types.

```tsx
// React 19+ pattern -- no forwardRef needed
type InputProps = {
  label: string;
  ref?: React.Ref<HTMLInputElement>;
} & Omit<React.ComponentProps<"input">, "ref">;

function Input({ label, ref, ...props }: InputProps) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
}

// Consumer
const inputRef = useRef<HTMLInputElement>(null);
<Input ref={inputRef} label="Email" type="email" />
```

### When to expose refs

- **Always** on leaf components that wrap native elements (Input, Button, TextArea).
- **Selectively** on composite components -- expose the root element ref.
- **Never** on logic-only components (providers, context wrappers).

### Imperative handles (rare, intentional)

When a component needs to expose methods rather than DOM access:

```tsx
import { useImperativeHandle, useRef } from "react";

type VideoPlayerHandle = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
};

type VideoPlayerProps = {
  src: string;
  ref?: React.Ref<VideoPlayerHandle>;
};

function VideoPlayer({ src, ref }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    seek: (time) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
  }));

  return <video ref={videoRef} src={src} />;
}
```

---

## 4. How Modern Libraries Structure Their APIs

### Radix Primitives (most influential pattern in 2025)

- Compound components via Context
- `asChild` prop for element substitution (uses `@radix-ui/react-slot` internally)
- `data-state` attributes for CSS styling hooks
- Controlled and uncontrolled modes via `value`/`defaultValue` + `onValueChange`
- NOTE: `asChild` is being reconsidered due to RSC and React Compiler issues

```tsx
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <Button variant="outline">Edit Profile</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="dialog-overlay" />
    <Dialog.Content className="dialog-content">
      <Dialog.Title>Edit Profile</Dialog.Title>
      <Dialog.Description>
        Make changes to your profile here.
      </Dialog.Description>
      <Dialog.Close asChild>
        <Button variant="ghost">Cancel</Button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### React Aria (Adobe)

Three-layer architecture: state hook + behavior hook + component.
Most thorough accessibility implementation available.

```tsx
// Layer 1: State hook (portable, framework-agnostic)
import { useToggleState } from "react-stately";
// Layer 2: Behavior hook (ARIA + keyboard + focus)
import { useSwitch, useFocusRing, VisuallyHidden } from "react-aria";

function Switch({ children, ...props }) {
  const state = useToggleState(props);
  const ref = useRef(null);
  const { inputProps } = useSwitch(props, state, ref);
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <VisuallyHidden>
        <input {...inputProps} {...focusProps} ref={ref} />
      </VisuallyHidden>
      <span
        data-selected={state.isSelected || undefined}
        data-focus-visible={isFocusVisible || undefined}
      >
        <span /> {/* thumb */}
      </span>
      {children}
    </label>
  );
}
```

### Headless UI (Tailwind Labs)

Render props + data attributes for Tailwind utility styling.

```tsx
import { Listbox } from "@headlessui/react";

<Listbox value={selected} onChange={setSelected}>
  <Listbox.Button>{selected.name}</Listbox.Button>
  <Listbox.Options>
    {people.map((person) => (
      <Listbox.Option key={person.id} value={person}>
        {({ active, selected }) => (
          <li className={active ? "bg-blue-100" : ""}>
            {selected && <CheckIcon />}
            {person.name}
          </li>
        )}
      </Listbox.Option>
    ))}
  </Listbox.Options>
</Listbox>
```

### Base UI (reached v1 December 2025)

Simpler package structure, render props, CSS hooks for styling.
Positions itself between Radix (full compound components) and React Aria (hooks only).

### Summary: API Shape Convergence

All modern headless libraries converge on:
1. **Compound components** for structural composition
2. **Controlled + uncontrolled** via value/defaultValue pairs
3. **Data attributes** (data-state, data-active, data-open) as styling hooks
4. **No default styles** -- bring your own CSS approach
5. **Portal support** for overlays (Dialog, Popover, Tooltip)

---

## 5. Accessibility-First Component Design Patterns

### Principle: Accessibility is architecture, not decoration

Build ARIA semantics into the component's internal structure. Do not rely on
consumers to add aria-* attributes correctly.

### Pattern: Internal ARIA wiring

```tsx
function Tabs({ children, label }: { children: ReactNode; label: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const tabs = tablistRef.current?.querySelectorAll('[role="tab"]');
    if (!tabs) return;
    const count = tabs.length;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setActiveTab((prev) => (prev + 1) % count);
        break;
      case "ArrowLeft":
        e.preventDefault();
        setActiveTab((prev) => (prev - 1 + count) % count);
        break;
      case "Home":
        e.preventDefault();
        setActiveTab(0);
        break;
      case "End":
        e.preventDefault();
        setActiveTab(count - 1);
        break;
    }
  };

  return (
    <div>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
      >
        {/* TabTrigger children rendered here with proper roles */}
      </div>
      {/* TabPanel children rendered here with proper association */}
    </div>
  );
}
```

### Pattern: VisuallyHidden for screen reader content

```tsx
function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
    >
      {children}
    </span>
  );
}

// Usage
<IconButton>
  <TrashIcon aria-hidden="true" />
  <VisuallyHidden>Delete item</VisuallyHidden>
</IconButton>
```

### Pattern: Focus management on mount/unmount

```tsx
function Dialog({ open, onClose, children }: DialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (open) {
      // Save current focus to restore later
      previousFocusRef.current = document.activeElement;
      // Move focus into dialog
      closeButtonRef.current?.focus();
    }
    return () => {
      // Restore focus when dialog closes
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true">
      {children}
      <button ref={closeButtonRef} onClick={onClose}>
        Close
      </button>
    </div>
  );
}
```

### Checklist for every component

- [ ] Correct ARIA role and states set internally
- [ ] Keyboard navigation matches WAI-ARIA Authoring Practices
- [ ] Focus is managed (trapped in modals, restored on close)
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI)
- [ ] Touch targets are at least 44x44px
- [ ] Reduced motion is respected via `prefers-reduced-motion`
- [ ] Screen reader announcements for dynamic content (live regions)

---

## 6. Styling: CSS-in-JS vs Tailwind vs CSS Modules

### Current state (2025-2026)

| Approach | Adoption | Runtime cost | Component library fit |
|---|---|---|---|
| **Tailwind CSS** | ~68% of new projects | Zero (build-time) | Best for app-level; shadcn/ui model |
| **CSS Modules** | Stable, mature | Zero (build-time) | Good for libraries shipping .css |
| **CSS custom properties** | Universal | Zero | Best for token-driven theming |
| **Zero-runtime CSS-in-JS** (Vanilla Extract, Panda CSS, Pigment CSS) | Growing | Zero (build-time) | Strong for libraries needing type-safe tokens |
| **Runtime CSS-in-JS** (styled-components, Emotion) | Declining | Runtime overhead | Avoid for new libraries |

### Recommendation for component libraries

Use **CSS custom properties for theming** + one of:

1. **CSS Modules** if you want maximum portability (no build tool opinions)
2. **Vanilla Extract / Panda CSS** if you want type-safe token references at build time
3. **Tailwind + CVA (Class Variance Authority)** if consumers already use Tailwind

The shadcn/ui model (copy-paste components using Tailwind + CVA) has become the
dominant pattern for Tailwind-based design systems:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles applied to all variants
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-md px-3",
        default: "h-10 px-4 py-2",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

### For style-agnostic component libraries (best portability)

Ship headless logic + data attributes. Let consumers choose styling:

```tsx
// Library ships this -- zero styling opinions
function Toggle({ pressed, onPressedChange, children, ...props }) {
  return (
    <button
      role="switch"
      aria-checked={pressed}
      data-state={pressed ? "on" : "off"}
      onClick={() => onPressedChange(!pressed)}
      {...props}
    >
      {children}
    </button>
  );
}

// Consumer styles with whatever they want:
// CSS Modules:  .toggle[data-state="on"] { background: var(--color-primary); }
// Tailwind:     className="data-[state=on]:bg-blue-600"
// Vanilla Extract: style({ selectors: { '&[data-state=on]': { ... } } })
```

---

## 7. Storybook 10 Best Practices

### CSF Factories (new in Storybook 10)

The factory syntax replaces verbose CSF 3 type annotations. Currently React-only,
expected to become the default in Storybook 11.

```tsx
// Button.stories.tsx -- CSF Factory syntax
import { config } from "#.storybook/preview";
import { Button } from "./Button";

// preview.meta() replaces `const meta: Meta<typeof Button> = { ... }`
const meta = config.meta({
  component: Button,
  args: {
    children: "Click me",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "ghost"],
    },
  },
});

export default meta;

// meta.story() replaces `const Primary: Story = { ... }`
export const Primary = meta.story({
  args: {
    variant: "default",
  },
});

export const Destructive = meta.story({
  args: {
    variant: "destructive",
  },
});

// Interaction test attached directly to the story via .test
export const WithInteraction = meta.story({
  args: {
    variant: "default",
    onClick: fn(),
  },
  async play({ canvasElement, args }) {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});
```

### Interaction Tests

```tsx
import { fn, expect, within, userEvent } from "storybook/test";

export const FormSubmission = meta.story({
  args: {
    onSubmit: fn(),
  },
  async play({ canvasElement, args, step }) {
    const canvas = within(canvasElement);

    await step("Fill in the form", async () => {
      await userEvent.type(canvas.getByLabelText("Email"), "test@example.com");
      await userEvent.type(canvas.getByLabelText("Password"), "secret123");
    });

    await step("Submit the form", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    });

    await step("Verify submission", async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "secret123",
      });
    });
  },
});
```

### Accessibility Testing with @storybook/addon-a11y

```tsx
// In preview.ts -- enable a11y checks globally
import { config } from "#.storybook/preview";

export default config({
  parameters: {
    a11y: {
      // axe-core configuration
      test: {
        runLevel: "AA", // WCAG 2.1 AA
      },
    },
  },
});

// Per-story override: disable specific rules
export const DarkBackground = meta.story({
  parameters: {
    a11y: {
      test: {
        rules: {
          "color-contrast": { enabled: false }, // custom theme handles this
        },
      },
    },
  },
});
```

### Community addon for ARIA pattern tests

```tsx
// Uses @etchteam/storybook-addon-a11y-interaction-tests
import { a11yButton } from "@etchteam/storybook-addon-a11y-interaction-tests";

export const AccessibleButton = meta.story({
  async play({ canvasElement, step }) {
    // Tests ARIA roles, keyboard activation, focus management
    await a11yButton({ canvasElement, step });
  },
});
```

---

## 8. Mobile-First Responsive Component Patterns

### Container Queries (93.9% browser support as of Dec 2025)

The biggest advancement for component-level responsiveness. Components respond
to their own container size, not the viewport.

```css
/* Component CSS -- responds to its own container, not viewport */
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

/* Stack vertically by default (mobile-first) */
.card__layout {
  display: flex;
  flex-direction: column;
}

/* Side-by-side when container is wide enough */
@container card (min-width: 480px) {
  .card__layout {
    flex-direction: row;
    align-items: flex-start;
  }

  .card__media {
    flex: 0 0 200px;
  }
}

@container card (min-width: 768px) {
  .card__media {
    flex: 0 0 300px;
  }
}
```

### React pattern: responsive prop syntax

Inspired by Chakra UI / Styled System, encode breakpoints in prop values:

```tsx
type ResponsiveValue<T> = T | { base?: T; sm?: T; md?: T; lg?: T; xl?: T };

type StackProps = {
  direction?: ResponsiveValue<"row" | "column">;
  gap?: ResponsiveValue<string>;
  children: ReactNode;
};

// Generates CSS custom properties per breakpoint
function Stack({ direction = "column", gap = "0", children }: StackProps) {
  const style = resolveResponsiveProps({
    "--stack-direction": direction,
    "--stack-gap": gap,
  });

  return (
    <div className="stack" style={style}>
      {children}
    </div>
  );
}

// Usage
<Stack direction={{ base: "column", md: "row" }} gap={{ base: "16px", md: "24px" }}>
  <Card />
  <Card />
</Stack>
```

### Prefer CSS-driven responsiveness over JS-driven

```tsx
// AVOID: JS media query hooks for layout changes
function Component() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
  // Problem: flickers on SSR, two component trees, breaks streaming
}

// PREFER: single component tree, CSS handles layout
function Component() {
  return (
    <div className="component">
      <div className="component__sidebar">...</div>
      <div className="component__main">...</div>
    </div>
  );
}
// CSS: .component { display: grid; grid-template-columns: 1fr; }
// CSS: @media (min-width: 768px) { .component { grid-template-columns: 280px 1fr; } }
```

### Touch target sizing

```css
/* Ensure interactive elements meet 44x44px minimum */
.interactive {
  min-height: 44px;
  min-width: 44px;
  /* If visual size must be smaller, extend touch area: */
  position: relative;
}

.interactive::after {
  content: "";
  position: absolute;
  inset: -8px; /* extends touch area by 8px in all directions */
}
```

---

## 9. Design Token Consumption Patterns

### W3C DTCG Specification (v2025.10 -- first stable release)

The Design Tokens Community Group released the first stable specification in
October 2025. Use the `.tokens.json` format for tool interoperability.

```json
{
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "{color.blue.600}",
        "$description": "Primary brand color for interactive elements"
      }
    },
    "blue": {
      "600": {
        "$type": "color",
        "$value": "#2563eb"
      }
    }
  },
  "space": {
    "3": {
      "$type": "dimension",
      "$value": "12px"
    },
    "4": {
      "$type": "dimension",
      "$value": "16px"
    }
  }
}
```

### Token pipeline: DTCG JSON -> Style Dictionary -> CSS custom properties

Tokens live in `.tokens.json` files. Style Dictionary (v4+) transforms them
to platform targets. For React component libraries, CSS custom properties are
the primary output:

```css
/* Generated by Style Dictionary from .tokens.json */
:root {
  --color-brand-primary: #2563eb;
  --color-text-primary: #1a1a2e;
  --color-text-secondary: #6b7280;
  --color-surface-default: #ffffff;
  --color-surface-raised: #f9fafb;
  --color-border-default: #e5e7eb;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}

/* Dark theme override */
[data-theme="dark"] {
  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-surface-default: #1a1a2e;
  --color-surface-raised: #2d2d44;
  --color-border-default: #374151;
}
```

### Consuming tokens in React components

```tsx
// Components reference tokens via CSS custom properties -- never hardcode values
function Card({ children, elevated = false }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: elevated
          ? "var(--color-surface-raised)"
          : "var(--color-surface-default)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
      }}
    >
      {children}
    </div>
  );
}

// Or with CSS Modules (preferred for library code):
// Card.module.css
// .card { background: var(--color-surface-default); border-radius: var(--radius-md); }
// .card[data-elevated] { background: var(--color-surface-raised); }
```

### Semantic token layers

Structure tokens in three tiers:

```
Tier 1 - Primitive:    --blue-600: #2563eb
Tier 2 - Semantic:     --color-brand-primary: var(--blue-600)
Tier 3 - Component:    --button-bg: var(--color-brand-primary)
```

Components should only reference Tier 2 (semantic) or Tier 3 (component) tokens.
Never reference Tier 1 primitives directly.

### Type-safe tokens with Vanilla Extract

```tsx
// tokens.css.ts -- compile-time token safety
import { createGlobalTheme } from "@vanilla-extract/css";

export const vars = createGlobalTheme(":root", {
  color: {
    brand: { primary: "#2563eb" },
    text: { primary: "#1a1a2e", secondary: "#6b7280" },
    surface: { default: "#ffffff", raised: "#f9fafb" },
  },
  space: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
});

// Component usage -- TypeScript catches invalid token references
import { style } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

export const card = style({
  background: vars.color.surface.default,
  borderRadius: vars.radius.md,
  padding: vars.space[4],
  // Type error: vars.color.surface.nonexistent
});
```

---

## Sources

### TypeScript Patterns
- [Expressive React Component APIs with Discriminated Unions -- Andrew Branch](https://blog.andrewbran.ch/expressive-react-component-apis-with-discriminated-unions/)
- [TypeScript Discriminated Unions for React Props](https://oneuptime.com/blog/post/2026-01-15-typescript-discriminated-unions-react-props/view)
- [Polymorphic React Components -- Ben Ilegbodu](https://www.benmvp.com/blog/polymorphic-react-components-typescript/)
- [React TypeScript Cheatsheets -- Advanced Patterns](https://react-typescript-cheatsheet.netlify.app/docs/advanced/patterns_by_usecase/)

### Compound Components and Composition
- [Slot-Based APIs in React](https://dev.to/talissoncosta/slot-based-apis-in-react-designing-flexible-and-composable-components-7pj)
- [Radix Primitives Introduction](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Challenges of asChild and Comparison with Other Composition Patterns](https://zenn.dev/tsuboi/articles/8abddb1ae3038f?locale=en)

### Forward Ref / React 19
- [React 19 Deprecates forwardRef](https://javascript.plainenglish.io/react-19-deprecated-forwardref-a-guide-to-passing-ref-as-a-standard-prop-7c0f13e6a229)
- [React v19 Official Blog](https://react.dev/blog/2024/12/05/react-19)

### Headless Library Comparison
- [Headless UI Alternatives: Radix vs React Aria vs Ark UI vs Base UI](https://blog.logrocket.com/headless-ui-alternatives-radix-primitives-react-aria-ark-ui/)
- [React Aria Documentation](https://react-aria.adobe.com/)

### Accessibility
- [Accessibility with Interactive Components -- React Advanced 2025](https://www.infoq.com/news/2025/12/accessibility-ariakit-react/)
- [React Aria Hooks](https://react-spectrum.adobe.com/react-aria/hooks.html)

### Styling
- [CSS-in-JS in 2025: Tailwind Dominates](https://jeffbruchado.com.br/en/blog/css-in-js-2025-tailwind-styled-components-trends)
- [React CSS in 2026: Best Styling Approaches Compared](https://medium.com/@imranmsa93/react-css-in-2026-best-styling-approaches-compared-d5e99a771753)

### Storybook 10
- [Storybook 10 Announcement](https://storybook.js.org/blog/storybook-10/)
- [CSF Factories Documentation](https://storybook.js.org/docs/8/api/csf/csf-factories)
- [Storybook Accessibility Testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Storybook Interaction Testing](https://storybook.js.org/docs/writing-tests/interaction-testing)

### Design Tokens
- [W3C DTCG Specification v2025.10](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Design Tokens and CSS Variables Guide](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [Modern Design Systems for React in 2025](https://inwald.com/2025/11/modern-design-systems-for-react-in-2025-a-pragmatic-comparison/)

### Responsive Design
- [Container Queries in 2026](https://blog.logrocket.com/container-queries-2026/)
- [Responsive Web Design Techniques 2026](https://lovable.dev/guides/responsive-web-design-techniques-that-work)
