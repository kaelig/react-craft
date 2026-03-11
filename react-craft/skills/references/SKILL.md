---
name: references
description: Bundled reference knowledge for React, accessibility, Storybook, responsive design, motion, and component API patterns. Loaded on-demand by agents as offline fallback when Context7 is unavailable.
user-invocable: false
version: 1.0.0
---

# References

Offline reference documents for agent use during the react-craft pipeline.

## How These Are Used

- Each agent loads **only** the reference it needs for its current task. Do not load all references at once.
- When Context7 MCP is available, prefer live documentation lookups. Fall back to these references when Context7 is unavailable or the query is faster to answer from local knowledge.
- These references are curated for component development patterns, not exhaustive API docs.

## Available References

| Reference | File | Used By |
|-----------|------|---------|
| React Patterns | `react-patterns.md` | Code Writer, Component Architect |
| Accessibility | `accessibility.md` | Accessibility Auditor, Code Writer, Quality Gate |
| Storybook & Testing | `storybook-testing.md` | Story Author, Quality Gate |
| Responsive & Mobile-First | `responsive-mobile-first.md` | Code Writer, Design Analyst |
| Motion & Animation | `motion-animation.md` | Code Writer, Visual Reviewer |
| Component API Design | `component-api-design.md` | Component Architect, Code Writer |
