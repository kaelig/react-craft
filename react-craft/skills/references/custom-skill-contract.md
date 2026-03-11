# Custom Skill Contract

Any SKILL.md that meets these requirements can be added to the react-craft pipeline:

1. **Input:** Accepts file paths as scope (glob or directory)
2. **Output format:** Findings in `[SEVERITY] file:line — category: description` format
   - Severities: `[ERROR]`, `[WARNING]`, `[INFO]`
3. **Self-contained:** Does not depend on other react-craft skills
4. **Config access:** May read `react-craft.config.yaml` for project context
5. **Exit behavior:** Returns findings list. Empty list = all checks passed.

## Frontmatter Requirements

Custom skill SKILL.md files must include YAML frontmatter with at minimum:

```yaml
---
name: your-skill-name
description: What this skill checks for. Keep it to one sentence.
user-invocable: false
allowed-tools: Read, Glob, Grep
---
```

- `name` — kebab-case identifier, unique across all skills in the pipeline
- `description` — used by the orchestrator to describe what is running
- `user-invocable: false` — custom pipeline skills are invoked by the orchestrator, not directly by users
- `allowed-tools` — list the tools your skill needs. Use `Read, Glob, Grep` for read-only skills. Add `Write, Edit` only if your skill modifies files.

## Output Format

Each finding must follow this exact format:

```
[SEVERITY] file:line — category: description
```

Examples:

```
[ERROR] src/components/Button.tsx:23 — missing-translation: Hardcoded string "Submit" should use i18n
[WARNING] src/components/Card.tsx:45 — hardcoded-color: Use design token instead of #333333
[INFO] src/components/Modal.tsx:12 — suggestion: Consider using <dialog> instead of <div role="dialog">
```

Findings are grouped by file. After all findings, include a summary section:

```
### Summary
- Scanned N files, found M findings
- X errors, Y warnings, Z info
```

## Config Access

Custom skills receive two inputs from the orchestrator:

1. **File paths in scope** — the files to check (component sources, not test/story files)
2. **Skill-specific config** — the `config` block from `pipeline.custom_skills` in `react-craft.config.yaml`

Skills may also read `react-craft.config.yaml` directly for project-level context (e.g., styling method, design system name, path aliases).

## Read-Only vs. Read-Write Skills

By default, custom skills are assumed to modify files (sequential execution). If your skill only reads files and never writes, mark it as `readonly: true` in the pipeline config to enable parallel execution with other read-only skills:

```yaml
pipeline:
  custom_skills:
    - skill: custom
      path: "path/to/SKILL.md"
      readonly: true
      config: {}
```

## Full Example

See the i18n-checker at `examples/custom-skills/i18n-checker/SKILL.md` for a complete working example. Here is the minimal structure:

```markdown
---
name: my-custom-checker
description: Checks for [what it checks]. Reports findings in standard react-craft format.
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# My Custom Checker

You check for [specific concern] in React component files.

## Instructions

### Step 1: Read Target Files

Read each file in the scope provided by the orchestrator.

### Step 2: Detect Issues

For each file, look for [patterns to detect]:

| Pattern | Category | Severity |
|---------|----------|----------|
| [pattern1] | category-name | ERROR |
| [pattern2] | category-name | WARNING |

### Step 3: Filter False Positives

DO NOT flag:
- [list of things to ignore]

### Step 4: Output Findings

Use the standard output format:

[ERROR] file:line — category: description
[WARNING] file:line — category: description
[INFO] file:line — category: description

### Summary
- Scanned N files, found M findings
```

## Adding to the Pipeline

Register your custom skill in `react-craft.config.yaml`:

```yaml
pipeline:
  custom_skills:
    - skill: custom
      path: "path/to/your-skill/SKILL.md"
      readonly: false
      config:
        your_option: "value"
```

The orchestrator will:
1. Validate that `SKILL.md` exists at the given path
2. Read the skill's frontmatter for name and description
3. Invoke the skill with the generated component files and skill-specific config
4. Collect findings and append them to `review.md` under `## Custom Skills`
5. If the skill crashes or returns malformed output, log a warning and continue
