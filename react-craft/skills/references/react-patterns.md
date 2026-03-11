# React Patterns Reference

> Last updated: 2026-03. Verify against Context7 when available.

Practical React 18/19 patterns for component library development.

---

## Table of Contents

- [Composition Patterns](#composition-patterns)
- [Hooks Patterns](#hooks-patterns)
- [Ref Patterns](#ref-patterns)
- [Portal Patterns](#portal-patterns)
- [Suspense and Lazy Loading](#suspense-and-lazy-loading)
- [Error Boundaries](#error-boundaries)

---

## Composition Patterns

### Children Prop

The default composition model. Prefer `children` over custom render props when the slot is a single, opaque content area.

```tsx
interface CardProps {
  readonly children: ReactNode;
  readonly variant?: 'elevated' | 'outlined';
}

function Card({ children, variant = 'outlined' }: CardProps) {
  return <div className={styles[variant]}>{children}</div>;
}
```

### Render Props

Use when the parent needs to pass data back to the consumer for rendering.

```tsx
interface ComboboxProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T, highlighted: boolean) => ReactNode;
}

function Combobox<T>({ items, renderItem }: ComboboxProps<T>) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  return (
    <ul role="listbox">
      {items.map((item, i) => (
        <li key={i} role="option" aria-selected={i === highlightedIndex}>
          {renderItem(item, i === highlightedIndex)}
        </li>
      ))}
    </ul>
  );
}
```

### Compound Components

Use for tightly coupled component groups that share implicit state. Expose context through a parent provider.

```tsx
const TabsContext = createContext<TabsContextValue | null>(null);

function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);
  return <TabsContext value={value}>{children}</TabsContext>;
}

function Tab({ value, children }: TabProps) {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error('Tab must be used within Tabs');
  return (
    <button
      role="tab"
      aria-selected={ctx.activeTab === value}
      onClick={() => ctx.setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }: TabPanelProps) {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error('TabPanel must be used within Tabs');
  if (ctx.activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
}
```

---

## Hooks Patterns

### Custom Hooks

Extract reusable stateful logic. Name with `use` prefix. Return a tuple or object, not a single value.

```tsx
function useControllable<T>(
  controlledValue: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (next: T) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internal;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [value, setValue];
}
```

### useCallback and useMemo

Use `useCallback` when passing callbacks to memoized children or as dependencies. Use `useMemo` for expensive computations. Do not wrap everything.

```tsx
// Justified: callback is a dependency of a child's useEffect
const handleResize = useCallback((entry: ResizeObserverEntry) => {
  setWidth(entry.contentRect.width);
}, []);

// Justified: filtering a large list on every render is expensive
const filtered = useMemo(
  () => items.filter((item) => item.name.includes(query)),
  [items, query],
);

// Unjustified: simple object literal, no perf concern
// const style = useMemo(() => ({ color: 'red' }), []);  // skip this
```

### useId for Accessibility

Generate stable, unique IDs for label-input associations.

```tsx
function TextField({ label }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={errorId} />
      <span id={errorId} role="alert" />
    </div>
  );
}
```

---

## Ref Patterns

### React 18: forwardRef

```tsx
const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, ...props }, ref) {
    const id = useId();
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input ref={ref} id={id} {...props} />
      </div>
    );
  },
);
```

### React 19: ref as Prop

No wrapper needed. Declare `ref` as a regular prop with the `Ref` type.

```tsx
interface InputProps {
  readonly label: string;
  readonly ref?: Ref<HTMLInputElement>;
}

function Input({ label, ref, ...props }: InputProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input ref={ref} id={id} {...props} />
    </div>
  );
}
```

### useImperativeHandle

Expose a reduced API surface from a ref. Prefer this over exposing the raw DOM node when consumers only need specific methods.

```tsx
interface DialogHandle {
  open: () => void;
  close: () => void;
}

function Dialog({ children, ref }: { children: ReactNode; ref?: Ref<DialogHandle> }) {
  const innerRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => innerRef.current?.showModal(),
    close: () => innerRef.current?.close(),
  }));

  return <dialog ref={innerRef}>{children}</dialog>;
}
```

---

## Portal Patterns

Portals render children into a DOM node outside the parent hierarchy. Use for overlays that need to escape `overflow: hidden` or stacking contexts.

### Modal Dialog

```tsx
function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
```

### Tooltip with Anchor Positioning

```tsx
function Tooltip({ anchorRef, content }: TooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
  }, [anchorRef]);

  return createPortal(
    <div role="tooltip" className={styles.tooltip} style={position}>
      {content}
    </div>,
    document.body,
  );
}
```

### Toast Container

Render all toasts into a single portal container to manage stacking.

```tsx
function ToastContainer({ toasts }: { toasts: readonly Toast[] }) {
  return createPortal(
    <div aria-live="polite" className={styles.toastStack}>
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className={styles.toast}>
          {toast.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}
```

---

## Suspense and Lazy Loading

### Lazy Component Loading

```tsx
const SettingsPanel = lazy(() => import('./SettingsPanel'));

function App() {
  return (
    <Suspense fallback={<Skeleton variant="panel" />}>
      <SettingsPanel />
    </Suspense>
  );
}
```

### Suspense Boundary Placement

Place boundaries at meaningful loading seams, not around every component.

```tsx
// Good: one boundary per route section
<Suspense fallback={<PageSkeleton />}>
  <Outlet />
</Suspense>

// Avoid: boundary around every component
// <Suspense fallback={<Spinner />}><Button /></Suspense>
```

### Named Chunk Hints

```tsx
const Chart = lazy(() => import(/* webpackChunkName: "chart" */ './Chart'));
```

---

## Error Boundaries

Error boundaries catch rendering errors in their subtree. They must be class components (no hook equivalent as of React 19).

```tsx
interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: ReactNode | ((error: Error) => ReactNode);
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      return typeof fallback === 'function'
        ? fallback(this.state.error)
        : fallback;
    }
    return this.props.children;
  }
}
```

### Usage

```tsx
<ErrorBoundary fallback={(error) => <ErrorCard message={error.message} />}>
  <DataGrid data={data} />
</ErrorBoundary>
```

Place error boundaries at:
- Route level (catch page-level failures)
- Widget level (isolate independent sections)
- Data-dependent sections (catch fetch/parse errors)

Do not wrap the entire app in a single error boundary. Users lose all context on error.
