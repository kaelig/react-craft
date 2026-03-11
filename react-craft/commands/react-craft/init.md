---
name: react-craft:init
description: Initialize a react-craft project — detects codebase conventions, writes config, and sets up CLAUDE.md instructions. Use when setting up react-craft in a new React project.
argument-hint: "[--defaults] [--scope=src/components]"
disable-model-invocation: true
allowed-tools: Read, Bash, Write, Edit, Glob, Grep
---

# Initialize React Craft

You are the react-craft init agent. Your job is to detect project conventions, write a `react-craft.config.yaml` config file, and wire up CLAUDE.md instructions. Be thorough but concise.

Parse the user's arguments:
- `--defaults` — skip all interactive prompts, use detected or sensible defaults
- `--scope=<path>` — override the default component scope directory (default: `src/components`)

Store parsed flags in your working memory as `USE_DEFAULTS` (boolean) and `SCOPE_DIR` (string).

---

## Step 1: Validate Prerequisites

### 1a. React project check

Read `package.json` in the current working directory (CWD).

- Look for `react` in `dependencies` or `devDependencies` or `peerDependencies`.
- If `react` is not found, detect what IS present (e.g., `vue`, `svelte`, `@angular/core`, `solid-js`, `preact`) and warn:

> react-craft is designed for React projects. I detected **[framework]** but no React dependency. You can still proceed, but results may not be useful. Continue? (y/n)

If `USE_DEFAULTS` is true, stop with an error instead of asking.

- If `package.json` does not exist at all, stop:

> No `package.json` found. Please run this command from the root of a JavaScript/TypeScript project.

### 1b. TypeScript version check

Read `node_modules/typescript/package.json` to get the installed TypeScript version.

- If TypeScript is not installed, warn:

> TypeScript is not installed. react-craft strongly recommends TypeScript >= 5.0. Components will be generated as `.tsx` files regardless. Install with: `npm install -D typescript`

- If the major version is below 5, warn:

> TypeScript **[version]** detected. react-craft targets TypeScript 5.0+. Some generated code patterns (satisfies, const type parameters) may not compile. Consider upgrading.

Record the detected version (or `"not installed"`) for the config.

### 1c. Figma MCP check

This step checks whether the user has a Figma MCP server configured. Since this command runs with `disable-model-invocation: true` and limited tools, you cannot invoke MCP tools directly.

Instead, use Bash to check for MCP configuration:

```
# Check for .mcp.json or .mcp/config.json in the project or home directory
```

Look for references to `figma` in any MCP config files found. Check these paths:
- `$CWD/.mcp.json`
- `$CWD/.mcp/config.json`
- `~/.claude/mcp.json`
- `~/.config/claude/mcp.json`

If no Figma MCP reference is found, warn:

> No Figma MCP server detected. The Design Analyst agent requires either:
> - **Figma Console MCP** by TJ Pitre (recommended): `npx @anthropic-ai/claude-code mcp add figma-console`
> - **Official Figma MCP**: Follow setup at https://github.com/figma/figma-mcp
>
> You can add one later and re-run `/react-craft:init`.

This is a warning only — do not block initialization.

---

## Step 2: Detect Codebase Conventions

Read `package.json` fully. Also read `tsconfig.json` if it exists. Run detection in this order:

### 2a. Styling Method

Check `dependencies` and `devDependencies` for these packages:

| Package | Method |
|---------|--------|
| `tailwindcss` | `tailwind` |
| `styled-components` | `styled-components` |
| `@emotion/styled` or `@emotion/react` | `emotion` |
| `vanilla-extract` or `@vanilla-extract/css` | `vanilla-extract` |

Also search for CSS Modules usage:

```bash
# Check for *.module.css or *.module.scss files
```

Use Glob to search for `**/*.module.css` and `**/*.module.scss` within the scope directory and `src/`.

Detection logic:
- If exactly one method is found, use it.
- If multiple are found and `USE_DEFAULTS` is false, ask:

> I detected multiple styling approaches: **[list]**. Which should react-craft use for new components?
> 1. [method1]
> 2. [method2]
> ...

- If multiple are found and `USE_DEFAULTS` is true, pick the first detected in this priority order: tailwind > css-modules > styled-components > emotion > vanilla-extract > vanilla.
- If none detected, default to `vanilla` (plain CSS files).

Record as `STYLING_METHOD`.

### 2b. React Version

Read `dependencies.react` from `package.json`. Extract the semver version (strip `^`, `~`, `>=` prefixes). Also try reading `node_modules/react/package.json` for the exact installed version.

Determine ref pattern:
- Major version 18 or below: `forwardRef` pattern
- Major version 19 or above: `ref` as prop pattern

Record `REACT_VERSION` and `REF_PATTERN`.

### 2c. TypeScript Config

Read `tsconfig.json` from CWD. If it extends another config (e.g., `"extends": "./tsconfig.base.json"`), read that file too.

Extract:

| Field | Config Key | Default |
|-------|-----------|---------|
| `compilerOptions.jsx` | `jsx_transform` | `react-jsx` |
| `compilerOptions.moduleResolution` | `module_resolution` | `bundler` |
| `compilerOptions.paths` | `path_aliases` | `{}` |
| `compilerOptions.baseUrl` | (used to resolve path_aliases) | `.` |
| `compilerOptions.verbatimModuleSyntax` | `verbatim_module_syntax` | `false` |

For `jsx_transform`:
- `react-jsx` or `react-jsxdev` means auto JSX transform (no `import React` needed)
- `react` means classic transform (`import React from 'react'` required)
- If field is absent, default to `react-jsx`

For `path_aliases`, convert TypeScript paths to a simplified map:
```yaml
path_aliases:
  "@/": "src/"
  "@components/": "src/components/"
```

Record all values.

### 2d. Design System / Component Library

Check `dependencies` and `devDependencies` for known libraries:

| Package pattern | Library name |
|----------------|-------------|
| `@mui/material` | Material UI |
| `@radix-ui/*` | Radix UI |
| `@chakra-ui/*` | Chakra UI |
| `@headlessui/react` | Headless UI |
| `react-aria` or `@react-aria/*` | React Aria |
| `@mantine/core` | Mantine |
| `antd` | Ant Design |
| `@shadcn/*` or presence of `components/ui/` dir | shadcn/ui |

Record `DS_LIBRARY` (name string or empty).

### 2e. Storybook Detection

Check `devDependencies` and `dependencies` for `storybook` or any `@storybook/*` package.

- If found, extract version number.
- Check for `.storybook/` directory.
- If NOT found, warn:

> Storybook not detected. The Story Author agent (v0.2) will need Storybook. Install with:
> ```
> npx storybook@latest init
> ```

Record `STORYBOOK_VERSION` (version string or `null`).

### 2f. Available Scripts

Read `scripts` from `package.json`. Identify relevant scripts for these categories:

| Category | Common script names to look for |
|----------|-------------------------------|
| lint | `lint`, `eslint`, `lint:fix` |
| format | `format`, `prettier`, `fmt` |
| typecheck | `typecheck`, `type-check`, `tsc`, `check-types` |
| test | `test`, `test:unit`, `vitest`, `jest` |
| build | `build`, `build:lib` |
| storybook | `storybook`, `storybook:dev`, `sb` |

For each category, compose the full command (e.g., `npm run lint` or `yarn lint` based on lockfile detection).

Detect package manager from lockfile presence:
- `pnpm-lock.yaml` -> `pnpm`
- `yarn.lock` -> `yarn`
- `bun.lockb` or `bun.lock` -> `bun`
- `package-lock.json` or none -> `npm`

If `USE_DEFAULTS` is false, present the detected scripts and ask for confirmation:

> I detected these scripts. Confirm which react-craft should use (reply with corrections or 'ok'):
>
> - **lint:** `npm run lint`
> - **format:** `npm run format`
> - **typecheck:** `npx tsc --noEmit`
> - **test:** `npm test`
> - **storybook:** `npm run storybook`
>
> If a script is wrong or missing, tell me the correct command.

If a category has no matching script, set a sensible fallback:
- lint: `npx eslint .`
- format: `npx prettier --write .`
- typecheck: `npx tsc --noEmit`
- test: (leave empty)
- storybook: (leave empty)

Record as `SCRIPTS` map.

### 2g. Dependency Policy (interactive only)

If `USE_DEFAULTS` is false, ask:

> Are there any npm packages you want react-craft to **never** add as dependencies? (comma-separated list, or 'none')
>
> Examples: `lodash, moment, jquery`

Record as `BANNED_DEPS` list.

If `USE_DEFAULTS` is true, set `BANNED_DEPS` to `[]`.

---

## Step 3: Write Config File

Write `react-craft.config.yaml` in the CWD. Use the exact structure below, filling in all detected values.

If `react-craft.config.yaml` already exists, read it first and ask (unless `USE_DEFAULTS`):

> `react-craft.config.yaml` already exists. Overwrite with fresh detection? (y/n)

If `USE_DEFAULTS` and file exists, back up to `react-craft.config.yaml.bak` before overwriting.

Write this structure:

```yaml
# react-craft configuration
# Generated by /react-craft:init on [YYYY-MM-DD]
# Docs: https://github.com/anthropics/react-craft

config_version: 1

# Fill in your design system details
design_system:
  name: ""
  component_prefix: ""
  figma_file_url: ""
  support_channel: ""
  support_label: ""

# Auto-detected project conventions
detection:
  styling_method: [STYLING_METHOD]
  react_version: "[REACT_VERSION]"
  ref_pattern: [REF_PATTERN]  # forwardRef | ref-prop
  typescript_version: "[TS_VERSION]"
  jsx_transform: [JSX_TRANSFORM]  # react-jsx | react
  module_resolution: [MODULE_RESOLUTION]  # bundler | node16 | node
  path_aliases: [PATH_ALIASES or {}]
  verbatim_module_syntax: [true/false]
  package_manager: [PACKAGE_MANAGER]  # npm | yarn | pnpm | bun
  ds_library: "[DS_LIBRARY]"  # detected component library, or ""

# Commands react-craft will invoke
scripts:
  lint: "[LINT_CMD]"
  format: "[FORMAT_CMD]"
  typecheck: "[TYPECHECK_CMD]"
  test: "[TEST_CMD]"
  storybook: "[STORYBOOK_CMD]"

# Agent pipeline configuration
# v0.1 agents: design-analyst, component-architect, code-writer, quality-gate
# v0.2 agents (disabled): accessibility-auditor, story-author, visual-reviewer
agents:
  design-analyst: true
  component-architect: true
  code-writer: true
  quality-gate: true
  accessibility-auditor: false
  story-author: false
  visual-reviewer: false

# Output paths (relative to project root)
output:
  components_dir: [SCOPE_DIR]
  docs_dir: docs/react-craft

# Dependency blocklist
banned_dependencies: [BANNED_DEPS]

# File scope for react-craft operations
scope:
  include:
    - "[SCOPE_DIR]/**/*.tsx"
    - "[SCOPE_DIR]/**/*.ts"
    - "[SCOPE_DIR]/**/*.css"
    - "[SCOPE_DIR]/**/*.scss"
  exclude:
    - "**/*.test.*"
    - "**/*.spec.*"
    - "**/*.stories.*"
    - "**/__tests__/**"
    - "**/__mocks__/**"
    - "**/node_modules/**"

# How strictly react-craft enforces rules
severity:
  type_error: error
  lint_error: error
  format_error: warning
  a11y_violation: error
  token_violation: warning
```

After writing, confirm:

> Wrote `react-craft.config.yaml` with detected settings. Review and edit any values — especially the `design_system` section.

---

## Step 4: Update CLAUDE.md

Check for `CLAUDE.md` in the CWD.

### If CLAUDE.md exists:

Read the file. Check if `<!-- react-craft:start -->` and `<!-- react-craft:end -->` markers already exist.

**If markers exist:** Replace everything between them (inclusive of markers) with the block below. This makes re-init idempotent.

**If markers do not exist:** Append the block below to the end of the file, preceded by a blank line.

### If CLAUDE.md does not exist:

Create `CLAUDE.md` with the block below as its contents.

### The block to insert:

```markdown
<!-- react-craft:start -->
## react-craft

This project uses [react-craft](https://github.com/anthropics/react-craft) for component development.

### Quick Commands
- `/react-craft:build <ComponentName>` — Run the full agent pipeline for a component
- `/react-craft:audit` — Validate existing components against conventions
- `/react-craft:init` — Re-detect project conventions and update config

### Conventions
- Config: `react-craft.config.yaml`
- Component docs: `docs/react-craft/components/<ComponentName>/`
- Styling: **[STYLING_METHOD]**
- Ref pattern: **[REF_PATTERN]**

### After Editing Components
When you edit any `.tsx`, `.jsx`, `.css`, or `.scss` file in `[SCOPE_DIR]`, consider running `/react-craft:audit` to validate against design system conventions.
<!-- react-craft:end -->
```

Fill in `[STYLING_METHOD]`, `[REF_PATTERN]`, and `[SCOPE_DIR]` with the detected values.

---

## Step 5: Create Output Directories

Create the docs output directory if it does not exist:

```bash
mkdir -p docs/react-craft/components
```

Do NOT create the components directory — it should already exist, and creating it could conflict with project structure.

---

## Step 6: Summary

Display a summary table. Use the exact format below:

```
react-craft initialized successfully.

  Styling:        [STYLING_METHOD]
  React:          [REACT_VERSION] (ref pattern: [REF_PATTERN])
  TypeScript:     [TS_VERSION]
  Package manager:[PACKAGE_MANAGER]
  Storybook:      [STORYBOOK_VERSION or "not detected"]
  DS library:     [DS_LIBRARY or "none detected"]
  Components dir: [SCOPE_DIR]
  Config file:    react-craft.config.yaml
  CLAUDE.md:      [updated | created]

Next steps:
  1. Edit `react-craft.config.yaml` — fill in the `design_system` section
  2. Set up Figma MCP if you haven't already
  3. Run `/react-craft:build ComponentName` to build your first component
```

If any warnings were raised during init, repeat them at the end:

```
Warnings:
  - TypeScript version 4.9.5 is below recommended 5.0
  - No Figma MCP detected
  - Storybook not installed
```

---

## Error Handling

- If any file read fails (permission, missing), log the issue and continue with defaults for that detection step.
- If `package.json` is completely missing, stop — this is a hard requirement.
- If writing `react-craft.config.yaml` fails, report the error and do not proceed to CLAUDE.md.
- Never swallow errors silently. Every warning or error must appear in the final summary.
