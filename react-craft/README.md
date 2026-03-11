# react-craft

**Multi-agent Figma-to-component pipeline for React.**

react-craft codifies 20 years of frontend expertise into a team of specialized AI agents that turn Figma designs into production-ready React components. Each agent owns a specific stage of the pipeline — extracting design specs, designing component APIs, writing code, and running quality checks — so the output meets the standards a senior developer would set by hand.

## Quick Start

### 1. Install the plugin

Add react-craft to your Claude Code plugins:

```
claude plugin add react-craft
```

### 2. Initialize your project

```
/react-craft:init
```

This creates a `react-craft.config.yaml` in your project root with your React version, styling approach, component output directory, and other conventions.

### 3. Build a component

```
/react-craft:build https://figma.com/design/abc123?node-id=1:42
```

Provide a Figma node-level URL. The pipeline runs four agents in sequence, producing a fully implemented component with types and documentation.

#### Options

- **`--best-effort`** — Skip all human gates. The pipeline uses agent judgment for ambiguity instead of stopping to ask.
- **`--resume <ComponentName>`** — Resume a previously failed pipeline from the last failed step.

```
/react-craft:build https://figma.com/design/abc123?node-id=1:42 --best-effort
/react-craft:build --resume DataTable
```

## Architecture

react-craft uses a linear pipeline of specialized agents. Each agent reads the upstream output, does its job, and writes a structured handoff document for the next.

### v0.1 Pipeline (4 agents)

1. **Design Analyst** — Extracts and validates design specs from Figma, produces the component brief
2. **Component Architect** — Designs component API: prop interfaces, composition strategy, file structure
3. **Code Writer** — Implements components following brief, architecture, and project conventions
4. **Quality Gate** — Runs TypeScript, linting, formatting checks; final mechanical validation

### v0.2 Pipeline (7 agents)

Adds three more agents between Code Writer and Quality Gate:

4. **Accessibility Auditor** — Reviews from disability perspective, runs axe-core and keyboard tests
5. **Story Author** — Creates Storybook stories covering every state and edge case
6. **Visual Reviewer** — Compares rendered component against Figma pixel-by-pixel

## Compatibility

react-craft works standalone and integrates with other Claude Code plugins for enhanced capabilities.

| Setup | What You Get |
|-------|-------------|
| **react-craft alone** | Full Figma-to-component pipeline with 4 agents (v0.1) |
| **react-craft + CE** | Enhanced with Compound Engineering's orchestration and agent coordination |
| **react-craft + BMAD** | Enhanced with BMAD's workflow management and project methodology |
| **react-craft + CE + BMAD** | Full stack: methodology, orchestration, and component pipeline |

## `--best-effort` Mode

When `--best-effort` is set, the pipeline runs autonomously without stopping for human input:

| Situation | Default Behavior |
|-----------|-----------------|
| Figma link lacks node-id | Continue with warning |
| Brief has pending items | Mark as assumed with reasoning |
| Git branch already exists | Reuse existing branch |
| Artifact hash mismatch on resume | Continue with warning |
| Quality Gate fails | Attempt remediation (max 3 tries) |
| Concurrent pipeline detected | Warn and stop (never override — data safety) |

This is useful for batch workflows or when you trust the pipeline's judgment.

## Security Model

- **Figma data sanitization** — Component names, variant names, and CSS classes are validated against strict patterns before use
- **Path canonicalization** — All output paths are validated to stay within the project directory
- **Prompt injection defense** — Figma-sourced text is wrapped in `[FIGMA_DATA]` delimiters so agents distinguish design data from instructions
- **Artifact integrity** — SHA-256 hashes verify pipeline artifacts haven't been tampered with between agent steps
- **Script execution** — react-craft executes user-defined scripts from package.json (lint, format, typecheck) during quality checks. These run with your shell's permissions. Review scripts during `/react-craft:init` when prompted

## Known Limitations (v0.1)

- No Storybook story generation (v0.2)
- No automated accessibility audit with axe-core (v0.2)
- No visual comparison against Figma (v0.2)
- No custom pipeline steps or enforcement skills (v0.3)
- Single component per pipeline run (no batch mode)

## Roadmap

### v0.1 (current)
- Plugin scaffold and shared documents
- `/react-craft:init` and `/react-craft:build` commands
- Design Analyst, Component Architect, Code Writer, Quality Gate agents
- Component brief and architecture templates

### v0.2
- Accessibility Auditor, Story Author, Visual Reviewer agents
- `/react-craft:audit` command
- Storybook MCP integration
- axe-core automated testing

### v0.3
- `/react-craft:eval` command with Figma fixture-based evaluation
- Enforcement skills (Guardian, Token Validator, Implementation Checker, Deviation Tracker)
- Custom pipeline step extensibility

## License

[MIT](./LICENSE)
