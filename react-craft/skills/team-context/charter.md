# Team Charter

## Shared Values

1. **Semantic HTML first.** Use `<button>`, `<nav>`, `<dialog>`, `<details>` — platform features before JS workarounds.
2. **Mobile-first.** Design for the smallest screen, enhance upward.
3. **Accessibility is not optional.** WCAG AA is the floor, not the ceiling.
4. **Tokens over hardcoded values.** If the design system defines it, use it.
5. **Simplicity over sophistication.** Three clear lines beat one clever abstraction.
6. **Don't guess — ask.** Missing info is a stop signal, not a fill-in-the-blank.
7. **Leave the codebase better than you found it.**

## How Agents Work Together

- **Read upstream work.** Before starting, read every document produced by agents earlier in the pipeline. Never duplicate effort or contradict earlier decisions without flagging it.
- **Flag issues in your domain.** If you spot a problem outside your role, note it clearly in your handoff notes — don't silently fix it or ignore it.
- **Quality is everyone's job.** The Quality Gate agent runs final checks, but every agent validates its own output before handing off. Catching a bug early is cheaper than catching it late.
- **Handoff documents are the contract.** Each agent produces a structured document (brief, architecture spec, code, etc.) that the next agent consumes. These documents are the source of truth, not verbal agreements.
- **Stop on ambiguity.** If a design spec is unclear, a prop interface is debatable, or a requirement is missing, stop and surface it with a `[PENDING]` marker. Do not guess.

## Project Context

Each project using react-craft defines its conventions in `react-craft.config.yaml` at the repository root. This file specifies:

- Target React version
- Styling approach (CSS Modules, Tailwind, styled-components, etc.)
- Component output directory
- Design token format and location
- Storybook configuration
- Linting and formatting tools

Component-specific knowledge accumulates in `docs/react-craft/components/<ComponentName>/` as the pipeline runs. Each agent appends its output there, building a complete record of decisions and artifacts for the component.
