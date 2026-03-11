# Contributing to react-craft

Thanks for your interest in contributing!

## Getting Started

1. Clone the repo
2. Install the plugin locally: `claude plugin add ./react-craft`
3. Test commands with a React project that has `package.json` and `tsconfig.json`

## Structure

```
react-craft/
  .claude-plugin/plugin.json   # Plugin manifest
  commands/react-craft/         # User-invocable commands (/react-craft:init, /react-craft:build)
  skills/                       # Agent skills (not user-invocable)
    design-analyst/             # Figma spec extraction
    component-architect/        # API design
    code-writer/                # Implementation
    quality-gate/               # TypeScript, lint, format checks
    team-context/               # Shared values and roster
    templates/                  # Brief and architecture templates
  CLAUDE.md                     # Plugin behavioral instructions
```

## Adding or Modifying Agent Skills

Each agent is a skill directory with:
- `SKILL.md` — Instructions the agent follows (keep under 500 lines)
- `reference.md` — Detailed patterns and examples (progressive disclosure)

When editing agent skills:
- Preserve the YAML frontmatter (`name`, `description`, `user-invocable: false`)
- Include input/output examples
- Test with a real Figma component through the full `/react-craft:build` pipeline

## Reporting Issues

Open an issue with:
- The command you ran (`/react-craft:init`, `/react-craft:build`)
- The error or unexpected behavior
- Your React version and styling method
