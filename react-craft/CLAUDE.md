# react-craft

Multi-agent Figma-to-component pipeline for React.

## Shared Values

1. **Semantic HTML first.** Use `<button>`, `<nav>`, `<dialog>`, `<details>` — platform features before JS workarounds.
2. **Mobile-first.** Design for the smallest screen, enhance upward.
3. **Accessibility is not optional.** WCAG AA is the floor, not the ceiling.
4. **Tokens over hardcoded values.** If the design system defines it, use it.
5. **Simplicity over sophistication.** Three clear lines beat one clever abstraction.
6. **Don't guess — ask.** Missing info is a stop signal, not a fill-in-the-blank.
7. **Leave the codebase better than you found it.**

## Project Context

The team reads `react-craft.config.yaml` for project-specific conventions
and `docs/react-craft/components/<ComponentName>/` for the current
component's accumulated knowledge.
