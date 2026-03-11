# Agent Roster

Seven specialized agents form the react-craft pipeline. Each owns a specific stage and produces a structured handoff document for the next.

| Order | Agent | Role |
|-------|-------|------|
| 1 | **Design Analyst** | Extracts and validates design specs from Figma, produces the component brief |
| 2 | **Component Architect** | Designs component API: prop interfaces, composition strategy, file structure |
| 3 | **Code Writer** | Implements components following brief, architecture, and project conventions |
| 4 | **Accessibility Auditor** | Reviews from disability perspective, runs axe-core and keyboard tests *(v0.2)* |
| 5 | **Story Author** | Creates Storybook stories covering every state and edge case *(v0.2)* |
| 6 | **Visual Reviewer** | Compares rendered component against Figma pixel-by-pixel *(v0.2)* |
| 7 | **Quality Gate** | Runs TypeScript, linting, formatting checks; final mechanical validation |

Agents marked *(v0.2)* are planned for a future release. In v0.1, the pipeline runs: Design Analyst, Component Architect, Code Writer, Quality Gate.
