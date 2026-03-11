# Architecture Template

Use this template when designing the implementation plan for a component. The Component Architect fills this in after reviewing the component brief.

---

## File Structure

_Define every file that will be created or modified, with its purpose._

```
src/components/<ComponentName>/
  <ComponentName>.tsx          # Main component
  <ComponentName>.types.ts     # TypeScript interfaces and types
  <ComponentName>.styles.*     # Styles (format depends on project config)
  <ComponentName>.test.tsx     # Unit tests
  <ComponentName>.stories.tsx  # Storybook stories (v0.2)
  index.ts                     # Public export barrel
```

## Prop Interface

_Define the TypeScript interface for the component's public API._

```typescript
interface <ComponentName>Props {
  /** Description of the prop */
  // propName: type;
}
```

### Prop Decisions

_Explain non-obvious decisions about the prop interface. Why was a prop included or excluded? What trade-offs were considered?_

| Prop | Decision | Rationale |
|------|----------|-----------|
| | | |

## Composition Strategy

_How is this component composed? Does it use compound components, render props, slots, or simple props? Explain the pattern and why it was chosen._

**Pattern:** _e.g., compound components, render props, simple props_

**Rationale:** _Why this pattern fits this component._

### Internal Components

_List any internal (non-exported) sub-components and their responsibilities._

| Component | Responsibility | Exported? |
|-----------|---------------|-----------|
| | | |

## Dependencies

_List runtime and dev dependencies. Flag any new dependencies that need to be added to the project._

| Dependency | Type | Purpose | New? |
|------------|------|---------|------|
| react | peer | Runtime | No |
| | | | |

## Accessibility Requirements

_Specific ARIA attributes, roles, and patterns required. Reference WAI-ARIA Authoring Practices where applicable._

- **Role:** _e.g., `dialog`, `alert`, `tabpanel`_
- **ARIA pattern:** _Link to WAI-ARIA Authoring Practices_
- **Required attributes:**
  - `aria-label` or `aria-labelledby` — _when and why_
- **Focus management:** _Describe focus trap, restore, or movement behavior_
- **Screen reader announcements:** _Any live regions or dynamic content_

## Handoff Notes

_Anything the Code Writer should know. Warnings about edge cases, performance considerations, browser quirks, or integration notes._
