# Responsive & Mobile-First Reference

> Last updated: 2026-03. Verify against Context7 when available.

Patterns for mobile-first responsive component development.

---

## Table of Contents

- [Standard Breakpoints](#standard-breakpoints)
- [Mobile-First Media Queries](#mobile-first-media-queries)
- [Container Queries](#container-queries)
- [Responsive Typography](#responsive-typography)
- [Touch Target Sizing](#touch-target-sizing)
- [Responsive Images](#responsive-images)
- [CSS Logical Properties](#css-logical-properties)

---

## Standard Breakpoints

| Name | Width | Typical Devices |
|------|-------|-----------------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape), small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

These are starting points. Override in `react-craft.config.yaml` if the project uses different values.

---

## Mobile-First Media Queries

Start with the smallest screen. Add complexity as space increases. Never write `max-width` queries unless fixing a single-breakpoint override.

### CSS

```css
.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@media (min-width: 768px) {
  .nav {
    flex-direction: row;
    gap: var(--space-4);
  }
}

@media (min-width: 1024px) {
  .nav {
    gap: var(--space-6);
  }
}
```

### Tailwind

Base classes are the mobile styles. Prefix for larger screens.

```tsx
<nav className="flex flex-col gap-2 md:flex-row md:gap-4 lg:gap-6">
  {items}
</nav>
```

### Grid Layout Progression

```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1280px) {
  .grid { grid-template-columns: repeat(4, 1fr); }
}
```

---

## Container Queries

Use container queries when a component's layout depends on its own container width, not the viewport. This is essential for reusable components that appear in sidebars, modals, and main content at different sizes.

### When to Use Container vs Viewport Queries

| Scenario | Use |
|----------|-----|
| Page-level layout (sidebar + main) | Viewport (`@media`) |
| Component adapts to its container | Container (`@container`) |
| Component used in multiple contexts | Container (`@container`) |
| Global header/footer | Viewport (`@media`) |

### CSS

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.card-image {
  aspect-ratio: 16 / 9;
  width: 100%;
}

@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: start;
  }

  .card-image {
    width: 200px;
    aspect-ratio: 1;
  }
}

@container card (min-width: 600px) {
  .card-image {
    width: 280px;
  }
}
```

### Tailwind (v3.2+)

```tsx
<div className="@container">
  <article className="flex flex-col gap-3 @sm:flex-row @sm:items-start">
    <img className="w-full aspect-video @sm:w-[200px] @sm:aspect-square" />
    <div className="flex-1">{content}</div>
  </article>
</div>
```

### Container Query Units

```css
.title {
  font-size: clamp(1rem, 3cqi, 1.5rem); /* cqi = 1% of container inline size */
}
```

---

## Responsive Typography

### Fluid Type with clamp()

Avoid jumping font sizes at breakpoints. Use `clamp()` for smooth scaling.

```css
h1 {
  /* min: 1.5rem (24px), preferred: 4vw, max: 3rem (48px) */
  font-size: clamp(1.5rem, 4vw, 3rem);
}

h2 {
  font-size: clamp(1.25rem, 3vw, 2rem);
}

p {
  font-size: clamp(1rem, 1.5vw, 1.125rem);
}
```

### Type Scale

A consistent type scale for components:

```css
:root {
  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.8rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 0.95rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.6vw, 1.35rem);
  --text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.6rem);
  --text-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
}
```

### Line Length

Constrain reading width for legibility. Aim for 45-75 characters per line.

```css
.prose {
  max-width: 65ch;
}
```

---

## Touch Target Sizing

WCAG 2.5.5 and 2.5.8 require adequate touch target sizing. Apple HIG recommends 44x44px minimum.

### Minimum Sizes

| Context | Minimum | Recommended |
|---------|---------|-------------|
| WCAG 2.2 AA (2.5.8) | 24x24px | 44x44px |
| Apple HIG | 44x44px | 44x44px |
| Material Design | 48x48dp | 48x48dp |

### Expanding Small Elements

When the visual element is smaller than the target area, expand the hit area with padding or pseudo-elements.

```css
/* Visual size is 24px, tap target is 44px */
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  position: relative;
}

.icon-button::after {
  content: '';
  position: absolute;
  inset: -10px; /* expands to 44x44 */
}
```

### Spacing Between Targets

Adjacent touch targets need adequate spacing to prevent mis-taps.

```css
.action-group {
  display: flex;
  gap: var(--space-2); /* at least 8px between targets */
}
```

---

## Responsive Images

### srcset for Resolution Switching

```tsx
<img
  src="/images/hero-800.jpg"
  srcSet="/images/hero-400.jpg 400w, /images/hero-800.jpg 800w, /images/hero-1200.jpg 1200w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt="Dashboard overview"
/>
```

### picture for Art Direction

Different crops or aspect ratios at different breakpoints.

```tsx
<picture>
  <source media="(min-width: 1024px)" srcSet="/images/banner-wide.jpg" />
  <source media="(min-width: 640px)" srcSet="/images/banner-medium.jpg" />
  <img src="/images/banner-narrow.jpg" alt="Promotional banner" />
</picture>
```

### aspect-ratio for Layout Stability

Prevent layout shift by declaring aspect ratio before the image loads.

```css
.thumbnail {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
}
```

### Lazy Loading

```tsx
<img src={src} alt={alt} loading="lazy" decoding="async" />
```

Only use `loading="eager"` for above-the-fold images (hero, logo). Everything else should be lazy.

---

## CSS Logical Properties

Use logical properties for RTL language support. They map to physical directions based on writing mode.

### Property Mapping

| Physical | Logical | LTR maps to | RTL maps to |
|----------|---------|-------------|-------------|
| `margin-left` | `margin-inline-start` | left | right |
| `margin-right` | `margin-inline-end` | right | left |
| `padding-left` | `padding-inline-start` | left | right |
| `padding-right` | `padding-inline-end` | right | left |
| `border-left` | `border-inline-start` | left | right |
| `text-align: left` | `text-align: start` | left | right |
| `float: left` | `float: inline-start` | left | right |
| `width` | `inline-size` | width | width |
| `height` | `block-size` | height | height |

### Practical Usage

```css
.sidebar {
  padding-inline-start: var(--space-4);
  padding-inline-end: var(--space-2);
  border-inline-end: 1px solid var(--color-border);
}

.list-item {
  margin-inline-start: var(--space-6); /* indentation */
  padding-block: var(--space-2);
}
```

### Shorthand Logical Properties

```css
.card {
  /* block = top/bottom, inline = left/right (in LTR) */
  padding-block: var(--space-4);
  padding-inline: var(--space-6);
  margin-block-end: var(--space-4);
}

.badge {
  /* inset shorthand for positioned elements */
  inset-inline-start: var(--space-2);
  inset-block-start: var(--space-2);
}
```

### Tailwind Logical Properties

Tailwind v3.3+ supports logical properties with `ms-` (margin-inline-start), `me-` (margin-inline-end), `ps-`, `pe-` prefixes.

```tsx
<div className="ps-4 pe-2 border-e">
  <span className="ms-6">{content}</span>
</div>
```
