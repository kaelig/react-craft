---
name: templates
description: Templates for component briefs and architecture docs. Use when creating new component specs or architecture documents in the react-craft pipeline.
user-invocable: false
---

# Templates

Structured templates that agents use to produce consistent handoff documents throughout the pipeline.

## Available Templates

- **[component-brief.md](./component-brief.md)** — Used by the Design Analyst to document extracted design specs. Covers variants, tokens, states, responsive behavior, motion, content, keyboard interaction, and gaps.
- **[architecture.md](./architecture.md)** — Used by the Component Architect to define file structure, prop interfaces, composition strategy, dependencies, and accessibility requirements.

## When to Use

- **Component brief**: At the start of every `/react-craft:build` run, after the Design Analyst extracts specs from Figma.
- **Architecture doc**: After the component brief is approved, when the Component Architect designs the implementation plan.

Both templates use YAML frontmatter for machine-readable metadata and Markdown sections for human-readable detail.
