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
  commands/react-craft/         # User-invocable commands (/react-craft:init, /react-craft:build, /react-craft:audit, /react-craft:eval)
  skills/                       # Agent skills (not user-invocable)
    design-analyst/             # Figma spec extraction
    component-architect/        # API design
    code-writer/                # Implementation
    accessibility-auditor/      # WCAG compliance testing
    story-author/               # Storybook story generation
    visual-reviewer/            # Figma vs Storybook visual comparison
    quality-gate/               # TypeScript, lint, format checks
    eval-runner/                # Eval suite execution and grading
    design-system-guardian/     # DS pattern enforcement
    token-validator/            # Design token usage validation
    implementation-checker/     # Implementation spec matching
    deviation-tracker/          # Intentional deviation tracking
    references/                 # Shared reference docs + custom skill contract
    team-context/               # Shared values and roster
    templates/                  # Brief and architecture templates
  evals/                        # Eval fixtures and reports
  hooks/                        # Shell-based lifecycle hooks
  examples/                     # Example fixtures and custom skills
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

## Adding Eval Fixtures

Eval fixtures live in `evals/fixtures/<fixture-name>/`:
- `input.yaml` — Anova YAML export (snapshotted, version-controlled)
- `input.sha256` — SHA-256 hash for integrity verification
- `EXPECTED_FINDINGS.md` — What enforcement skills should find
- `metadata.yaml` — Complexity, design system, expected agents, tags

To add a fixture:
1. Export an Anova YAML from Figma for the component
2. Create the directory and files following the existing fixtures as templates
3. Compute the SHA-256: `shasum -a 256 input.yaml | awk '{print $1}' > input.sha256`
4. Run `/react-craft:eval --fixture=<name>` to verify it works

## Writing Custom Pipeline Skills

Custom skills extend the pipeline with project-specific checks. See `skills/references/custom-skill-contract.md` for the full contract and `examples/custom-skills/i18n-checker/` for a working example.

Key requirements:
- Accept file paths as input scope
- Output findings in `[SEVERITY] file:line — category: description` format
- Be self-contained (no dependencies on react-craft internals)

## Reporting Issues

Open an issue with:
- The command you ran (`/react-craft:init`, `/react-craft:build`)
- The error or unexpected behavior
- Your React version and styling method
