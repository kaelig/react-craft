# Storybook & Testing Reference

> Last updated: 2026-03. Verify against Context7 when available.

Storybook 10 patterns using CSF Factories, play functions, and accessibility testing.

---

## Table of Contents

- [CSF Factories](#csf-factories)
- [Play Functions and Interaction Testing](#play-functions-and-interaction-testing)
- [Interaction Recipes](#interaction-recipes)
- [Accessibility Testing](#accessibility-testing)
- [Responsive Stories](#responsive-stories)
- [TypeScript Patterns](#typescript-patterns)

---

## CSF Factories

Storybook 10 introduces CSF Factories as the primary story format. Stories are created with `config()` and `story()`.

### Basic Setup

```tsx
// Button.stories.tsx
import { config, story } from '@storybook/react';
import { Button } from './Button';

const { meta, story: createStory } = config({
  component: Button,
  title: 'Components/Button',
  args: {
    children: 'Click me',
    variant: 'primary',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    onClick: { action: 'clicked' },
  },
});

export default meta;
```

### Defining Stories

```tsx
export const Primary = createStory({});

export const Secondary = createStory({
  args: { variant: 'secondary' },
});

export const WithIcon = createStory({
  args: {
    children: 'Save',
    icon: <SaveIcon />,
  },
});

export const Disabled = createStory({
  args: { disabled: true },
});
```

### Decorators

Wrap stories with providers, layout containers, or theme context.

```tsx
const { meta, story: createStory } = config({
  component: Dialog,
  decorators: [
    (Story) => (
      <div style={{ minHeight: '400px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
});
```

### Parameters

```tsx
export const DarkMode = createStory({
  parameters: {
    backgrounds: { default: 'dark' },
    layout: 'centered',
  },
});
```

---

## Play Functions and Interaction Testing

Play functions run after a story renders, enabling interaction testing directly within Storybook.

### Core API

```tsx
import { expect, within, userEvent, fn } from 'storybook/test';

export const SubmitForm = createStory({
  args: {
    onSubmit: fn(),
  },
  play: async ({ canvas, args, step }) => {
    const screen = within(canvas);

    await step('Fill in the form', async () => {
      await userEvent.type(screen.getByLabelText('Name'), 'Ada Lovelace');
      await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    });

    await step('Submit', async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    });

    await step('Verify callback', async () => {
      await expect(args.onSubmit).toHaveBeenCalledOnce();
    });
  },
});
```

### Canvas Queries

Use Testing Library queries through `within(canvas)`:

```tsx
const screen = within(canvas);

// By role (preferred)
screen.getByRole('button', { name: 'Save' });
screen.getByRole('textbox', { name: 'Email' });
screen.getByRole('combobox');
screen.getByRole('tab', { selected: true });

// By label
screen.getByLabelText('Password');

// By text
screen.getByText('No results found');

// By test ID (last resort)
screen.getByTestId('chart-container');

// Query (returns null instead of throwing)
screen.queryByRole('alert');

// Find (async, waits for element to appear)
await screen.findByRole('dialog');
```

---

## Interaction Recipes

### Click

```tsx
play: async ({ canvas }) => {
  const screen = within(canvas);
  await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));
  await expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-pressed', 'true');
},
```

### Type and Clear

```tsx
play: async ({ canvas }) => {
  const screen = within(canvas);
  const input = screen.getByRole('textbox', { name: 'Search' });
  await userEvent.type(input, 'React');
  await expect(input).toHaveValue('React');
  await userEvent.clear(input);
  await expect(input).toHaveValue('');
},
```

### Keyboard Navigation

```tsx
play: async ({ canvas }) => {
  const screen = within(canvas);
  const firstTab = screen.getByRole('tab', { name: 'General' });
  await userEvent.click(firstTab);
  await userEvent.keyboard('{ArrowRight}');
  await expect(screen.getByRole('tab', { name: 'Privacy' })).toHaveFocus();
},
```

### Hover and Tooltip

```tsx
play: async ({ canvas }) => {
  const screen = within(canvas);
  await userEvent.hover(screen.getByRole('button', { name: 'Info' }));
  await expect(await screen.findByRole('tooltip')).toBeVisible();
  await userEvent.unhover(screen.getByRole('button', { name: 'Info' }));
},
```

### Select from Dropdown

```tsx
play: async ({ canvas }) => {
  const screen = within(canvas);
  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(screen.getByRole('option', { name: 'United States' }));
  await expect(screen.getByRole('combobox')).toHaveTextContent('United States');
},
```

### Form Submission with Validation

```tsx
play: async ({ canvas }) => {
  const screen = within(canvas);

  // Submit empty form
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

  // Verify validation errors
  await expect(screen.getByText('Name is required')).toBeVisible();
  await expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');

  // Fill and resubmit
  await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
},
```

---

## Accessibility Testing

### axe-core via Addon

The `@storybook/addon-a11y` addon runs axe-core on every story. Configure it globally or per-story.

```tsx
// .storybook/preview.ts
import { config } from '@storybook/react';

export default config({
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'landmark-unique', enabled: false }, // disable for isolated components
        ],
      },
    },
  },
});
```

### In Play Functions

```tsx
import { expect, within } from 'storybook/test';

play: async ({ canvas }) => {
  await expect(canvas).toHaveNoViolations();
},
```

### Per-Story Overrides

```tsx
export const HighContrast = createStory({
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', options: { noScroll: true } },
        ],
      },
    },
  },
});
```

### Disabling for a Specific Story

```tsx
export const DecorativeOnly = createStory({
  parameters: {
    a11y: { disable: true },
  },
});
```

---

## Responsive Stories

### Viewport Parameters

```tsx
export const Mobile = createStory({
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
});

export const Tablet = createStory({
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
});

export const Desktop = createStory({
  parameters: {
    viewport: { defaultViewport: 'responsive' },
  },
});
```

### Custom Viewports

```tsx
// .storybook/preview.ts
export default config({
  parameters: {
    viewport: {
      viewports: {
        sm: { name: 'Small (640px)', styles: { width: '640px', height: '900px' } },
        md: { name: 'Medium (768px)', styles: { width: '768px', height: '1024px' } },
        lg: { name: 'Large (1024px)', styles: { width: '1024px', height: '768px' } },
        xl: { name: 'XL (1280px)', styles: { width: '1280px', height: '900px' } },
      },
    },
  },
});
```

### Responsive Interaction Testing

```tsx
export const MobileMenu = createStory({
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvas }) => {
    const screen = within(canvas);
    // On mobile, navigation should be behind a hamburger menu
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await expect(screen.getByRole('navigation')).toBeVisible();
  },
});
```

---

## TypeScript Patterns

### Typed Story with satisfies

```tsx
import type { StoryObj, Meta } from '@storybook/react';

type Story = StoryObj<typeof Button>;

export const Primary = createStory({
  args: { variant: 'primary', children: 'Click' },
}) satisfies Story;
```

### Typed Args

```tsx
const { meta, story: createStory } = config({
  component: Button,
  args: {
    children: 'Click',
    variant: 'primary',
    size: 'md',
  } satisfies Partial<ButtonProps>,
});
```

### Render Override for Complex Composition

```tsx
export const WithForm = createStory({
  render: (args) => (
    <form onSubmit={(e) => e.preventDefault()}>
      <TextField label="Name" />
      <Button {...args} type="submit" />
    </form>
  ),
  args: { children: 'Submit' },
});
```

### Annotated Args for Documentation

```tsx
const { meta, story: createStory } = config({
  component: Alert,
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Visual severity of the alert',
      table: {
        type: { summary: 'AlertVariant' },
        defaultValue: { summary: 'info' },
      },
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether the alert can be closed by the user',
    },
  },
});
```
