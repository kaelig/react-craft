# Story Author Reference

Patterns, API details, and recipes for Storybook 10 CSF Factories stories.

---

## CSF Factories API

### `config()`

The `config()` function replaces the legacy `satisfies Meta<typeof Component>` pattern. It returns `{ meta, story }`.

```typescript
import { config, fn } from '@storybook/test';
import { MyComponent } from './MyComponent';

const { meta, story } = config({
  component: MyComponent,
  args: {
    // Default args for all stories
    onAction: fn(),
  },
  argTypes: {
    // Controls and descriptions
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Visual variant of the component',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
  decorators: [
    // Wrappers applied to all stories in this file
    (Story) => (
      <div style={{ padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    // Storybook parameters for all stories
    layout: 'centered',
  },
});

export default meta;
```

### `story()`

Creates individual stories. Inherits from `meta` and can override any field.

```typescript
export const Default = story({});

export const WithCustomArgs = story({
  args: { variant: 'secondary', size: 'lg' },
});

export const WithDecorator = story({
  decorators: [
    (Story) => (
      <ThemeProvider theme="dark">
        <Story />
      </ThemeProvider>
    ),
  ],
});

export const WithPlay = story({
  play: async ({ canvas, step }) => {
    // interaction test
  },
});

export const WithParameters = story({
  parameters: {
    backgrounds: { default: 'dark' },
  },
});
```

### `fn()` for Action Callbacks

Use `fn()` from `@storybook/test` for all callback props. This replaces the legacy `action()` function.

```typescript
import { config, fn } from '@storybook/test';

const { meta, story } = config({
  component: Form,
  args: {
    onSubmit: fn(),
    onChange: fn(),
    onBlur: fn(),
  },
});
```

`fn()` integrates with play functions --- you can assert calls:

```typescript
export const SubmitForm = story({
  args: { onSubmit: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
});
```

---

## Play Function Patterns

### Imports

```typescript
import { expect, userEvent, within, waitFor } from '@storybook/test';
```

### Canvas and Within

The `canvas` argument is the Testing Library screen scoped to the story's root element.

```typescript
play: async ({ canvas }) => {
  const button = canvas.getByRole('button', { name: 'Submit' });
  const input = canvas.getByLabelText('Email');
  const heading = canvas.getByText('Welcome');
}
```

For nested containers, use `within`:

```typescript
play: async ({ canvas }) => {
  const dialog = canvas.getByRole('dialog');
  const dialogScreen = within(dialog);
  const closeButton = dialogScreen.getByRole('button', { name: 'Close' });
}
```

### Steps

Use `step()` to organize interaction sequences into labeled groups:

```typescript
play: async ({ canvas, step }) => {
  await step('Fill in the form', async () => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Jane Doe');
    await userEvent.type(canvas.getByLabelText('Email'), 'jane@example.com');
  });

  await step('Submit the form', async () => {
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }));
  });

  await step('Verify success message', async () => {
    await expect(canvas.getByText('Form submitted')).toBeVisible();
  });
}
```

### Waiting for Async

```typescript
play: async ({ canvas }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Load' }));

  // Wait for async content
  await waitFor(() => {
    expect(canvas.getByText('Loaded content')).toBeVisible();
  });
}
```

---

## Interaction Test Recipes

### Click

```typescript
play: async ({ canvas }) => {
  await userEvent.click(canvas.getByRole('button'));
}
```

### Type Text

```typescript
play: async ({ canvas }) => {
  const input = canvas.getByLabelText('Username');
  await userEvent.clear(input);
  await userEvent.type(input, 'newvalue');
  await expect(input).toHaveValue('newvalue');
}
```

### Hover

```typescript
play: async ({ canvas }) => {
  const trigger = canvas.getByRole('button', { name: 'Options' });
  await userEvent.hover(trigger);
  await expect(canvas.getByRole('tooltip')).toBeVisible();
  await userEvent.unhover(trigger);
  await waitFor(() => {
    expect(canvas.queryByRole('tooltip')).not.toBeInTheDocument();
  });
}
```

### Keyboard Navigation

```typescript
play: async ({ canvas, step }) => {
  await step('Tab through interactive elements', async () => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'First' })).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Second' })).toHaveFocus();
  });

  await step('Activate with keyboard', async () => {
    await userEvent.keyboard('{Enter}');
    // Assert activation effect
  });

  await step('Navigate with arrow keys', async () => {
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowUp}');
  });
}
```

### Focus Trap (Dialogs, Modals)

```typescript
play: async ({ canvas, step }) => {
  await step('Open dialog', async () => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    await expect(canvas.getByRole('dialog')).toBeVisible();
  });

  await step('Focus is trapped inside dialog', async () => {
    const dialog = within(canvas.getByRole('dialog'));
    const closeButton = dialog.getByRole('button', { name: 'Close' });

    // Tab through all focusable elements --- focus should cycle
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    // Should wrap back to first focusable element inside dialog
  });

  await step('Escape closes dialog', async () => {
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  await step('Focus returns to trigger', async () => {
    await expect(canvas.getByRole('button', { name: 'Open' })).toHaveFocus();
  });
}
```

### Drag and Drop

```typescript
play: async ({ canvas }) => {
  const source = canvas.getByText('Drag me');
  const target = canvas.getByText('Drop here');

  await userEvent.pointer([
    { keys: '[MouseLeft>]', target: source },
    { target },
    { keys: '[/MouseLeft]' },
  ]);
}
```

### Select from Dropdown

```typescript
play: async ({ canvas }) => {
  await userEvent.selectOptions(
    canvas.getByRole('combobox', { name: 'Country' }),
    'US',
  );
  await expect(canvas.getByRole('combobox', { name: 'Country' })).toHaveValue('US');
}
```

---

## Accessibility Addon Integration

### Setup

The `@storybook/addon-a11y` addon provides axe-core integration. When installed, every story gets an a11y panel. For programmatic assertion:

```typescript
export const A11y = story({
  play: async ({ canvas }) => {
    await expect(canvas).toHaveNoViolations();
  },
});
```

### Scoped A11y Checks

Test specific WCAG criteria:

```typescript
export const A11yColorContrast = story({
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas).toHaveNoViolations();
  },
});
```

### Disabling Rules

When a known violation is intentional (rare), disable specific rules:

```typescript
export const DecorativeImage = story({
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'image-alt', enabled: false }],
      },
    },
  },
});
```

---

## Viewport Parameters for Responsive Stories

### Standard Viewport Definitions

```typescript
// Mobile: 375px (iPhone SE / small Android)
export const Mobile = story({
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
});

// Tablet: 768px (iPad portrait)
export const Tablet = story({
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
});

// Desktop: 1280px (standard laptop)
export const Desktop = story({
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
});
```

### Custom Viewport Sizes

```typescript
export const NarrowMobile = story({
  parameters: {
    viewport: {
      defaultViewport: 'custom',
      viewports: {
        custom: { name: 'Narrow Mobile', styles: { width: '320px', height: '568px' } },
      },
    },
  },
});
```

### Responsive Story Matrix

When testing a component at multiple breakpoints matters:

```typescript
const viewports = ['mobile', 'tablet', 'desktop'] as const;

// Generate responsive variants programmatically if needed
export const ResponsivePrimary = story({
  args: { variant: 'primary' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
});
```

---

## Edge Case Story Patterns

### Long Text Overflow

```typescript
const LONG_TEXT =
  'This is an extremely long string that is designed to test how the component handles text overflow. It should be long enough to exceed any reasonable container width and trigger wrapping, truncation, or ellipsis behavior depending on the component implementation.';

export const LongText = story({
  args: { children: LONG_TEXT },
});

export const LongTitle = story({
  args: {
    title: LONG_TEXT,
    description: LONG_TEXT,
  },
});
```

### Empty and Null Content

```typescript
export const EmptyChildren = story({
  args: { children: null },
});

export const EmptyArray = story({
  args: { items: [] },
});

export const UndefinedOptional = story({
  args: { subtitle: undefined, icon: undefined },
});

export const EmptyString = story({
  args: { label: '' },
});
```

### RTL Layout

```typescript
export const RTL = story({
  args: { children: 'Button' },
  parameters: { direction: 'rtl' },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
});

export const RTLArabic = story({
  args: { children: '\u0632\u0631' },
  parameters: { direction: 'rtl' },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
});
```

### Loading State with Artificial Delay

```typescript
export const LoadingState = story({
  args: { loading: true },
});

export const LoadThenResolve = story({
  args: { loading: true },
  play: async ({ canvas }) => {
    // Verify loading indicator is shown
    await expect(canvas.getByRole('progressbar')).toBeVisible();

    // Wait for content to load (mock resolves)
    await waitFor(
      () => {
        expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  },
});
```

### Error State with Mock Failed Fetch

```typescript
export const ErrorState = story({
  args: { error: 'Failed to load data. Please try again.' },
});

export const ErrorWithRetry = story({
  args: { error: 'Network error' },
  play: async ({ canvas, step }) => {
    await step('Error message is visible', async () => {
      await expect(canvas.getByText('Network error')).toBeVisible();
    });
    await step('Retry button is available', async () => {
      await expect(canvas.getByRole('button', { name: /retry/i })).toBeVisible();
    });
  },
});
```

---

## Matrix Story Pattern

When a component has multiple dimensions (variant x size x state) and the total combinations exceed 20, use a matrix pattern instead of individual stories.

### Variant x Size Matrix

```typescript
const variants = ['primary', 'secondary', 'ghost'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

// Generate a matrix story that renders all combinations
export const VariantSizeMatrix = story({
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: `repeat(${sizes.length}, auto)` }}>
      {variants.map((variant) =>
        sizes.map((size) => (
          <Button key={`${variant}-${size}`} variant={variant} size={size}>
            {variant} {size}
          </Button>
        )),
      )}
    </div>
  ),
});
```

### Variant x State Matrix

```typescript
const states = [
  { name: 'Default', props: {} },
  { name: 'Disabled', props: { disabled: true } },
  { name: 'Loading', props: { loading: true } },
] as const;

export const VariantStateMatrix = story({
  render: () => (
    <table>
      <thead>
        <tr>
          <th />
          {states.map((state) => (
            <th key={state.name}>{state.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {variants.map((variant) => (
          <tr key={variant}>
            <td>{variant}</td>
            {states.map((state) => (
              <td key={state.name}>
                <Button variant={variant} {...state.props}>
                  {variant}
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
});
```

Use matrix stories for visual comparison. Keep individual stories for interaction tests.

---

## Story Naming Conventions

### File Names

- `ComponentName.stories.tsx` --- always PascalCase matching the component

### Export Names

- PascalCase for story exports: `Primary`, `Secondary`, `LongText`
- Descriptive names that explain the state: `DisabledWithTooltip`, not `Story3`
- Group by category using comments:

```typescript
// --- Variants ---
export const Primary = story({...});
export const Secondary = story({...});

// --- States ---
export const Disabled = story({...});
export const Loading = story({...});

// --- Interaction Tests ---
export const ClickInteraction = story({...});

// --- Edge Cases ---
export const LongText = story({...});
```

### Autodocs Title

```typescript
const { meta, story } = config({
  component: Button,
  title: 'Components/Button',
});
```

---

## Co-Located vs Separate Stories Directory

### Co-Located (Recommended)

Stories live next to the component:

```
src/components/Button/
  Button.tsx
  Button.stories.tsx
  Button.module.css
  index.ts
```

### Separate Directory

Stories live in a parallel structure:

```
src/components/Button/
  Button.tsx
  index.ts
stories/components/Button/
  Button.stories.tsx
```

Read `react-craft.config.yaml` `output.stories_pattern` to determine which pattern the project uses. When absent, default to co-located.

---

## Common Story Failures and Fixes

### Args Type Mismatch

**Error:** `Type 'string' is not assignable to type '"primary" | "secondary"'`

**Fix:** Use the exact union type values in args:

```typescript
// Wrong
export const Primary = story({ args: { variant: 'Primary' } });

// Correct
export const Primary = story({ args: { variant: 'primary' } });
```

### Missing Decorator

**Error:** Component throws because a required context provider is missing (theme, router, store).

**Fix:** Add the provider as a decorator:

```typescript
const { meta, story } = config({
  component: ThemedCard,
  decorators: [
    (Story) => (
      <ThemeProvider theme={defaultTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
});
```

### Import Errors

**Error:** `Module not found: Can't resolve './Button'`

**Fix:** Check the component's barrel export. Import from the component file directly, not the index:

```typescript
// If index re-export is broken, import directly
import { Button } from './Button';
// Not: import { Button } from '.';
```

### Missing Required Props

**Error:** `TypeError: Cannot read properties of undefined`

**Fix:** Provide all required props in `config()` args or in the story's args:

```typescript
const { meta, story } = config({
  component: DataTable,
  args: {
    columns: [{ key: 'name', label: 'Name' }],
    rows: [{ name: 'Example' }],
    onSort: fn(),
  },
});
```

### Play Function Timing

**Error:** `Unable to find role="dialog"` (element not rendered yet)

**Fix:** Use `waitFor` or `findBy` queries for async content:

```typescript
play: async ({ canvas }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Open' }));

  // Wrong: getByRole throws if not immediately present
  // const dialog = canvas.getByRole('dialog');

  // Correct: findByRole waits for the element
  const dialog = await canvas.findByRole('dialog');
  await expect(dialog).toBeVisible();
}
```

### Storybook Test Runner Failures

**Error:** `ReferenceError: userEvent is not defined`

**Fix:** Import from `@storybook/test`, not from `@testing-library/user-event`:

```typescript
// Correct
import { userEvent, expect, within, waitFor } from '@storybook/test';

// Wrong
import userEvent from '@testing-library/user-event';
```
