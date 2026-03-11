# Figma MCP Best Practices for AI-Powered Design-to-Code Pipelines

**Date:** 2026-03-11
**Status:** Research complete

---

## 1. Figma Console MCP (by TJ Pitre / Southleft)

### Overview

Figma Console MCP is an open-source (MIT) MCP server that treats your Figma design system as a full API. It connects AI assistants to Figma via a WebSocket Desktop Bridge plugin, enabling reading, writing, creation, debugging, and variable management.

- **Current version:** v1.11.2 (stable, production-ready)
- **Total tools:** 57+ (local/NPX mode), 22 (remote SSE read-only mode)
- **Repository:** https://github.com/southleft/figma-console-mcp
- **Docs:** https://docs.figma-console-mcp.southleft.com

### Tool Categories

| Category | Count | Key Tools |
|----------|-------|-----------|
| **Design System Extraction** | 8 | `figma_get_design_system_kit`, `figma_get_variables`, `figma_get_component`, `figma_get_component_for_development`, `figma_get_component_image`, `figma_get_styles`, `figma_get_file_data`, `figma_get_file_for_plugin` |
| **Variable Management** | 11 | `figma_create_variable_collection`, `figma_create_variable`, `figma_update_variable`, `figma_batch_create_variables`, `figma_batch_update_variables`, `figma_setup_design_tokens`, `figma_add_mode`, `figma_rename_mode`, `figma_rename_variable`, `figma_delete_variable`, `figma_delete_variable_collection` |
| **Console Debugging** | 4 | `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`, `figma_reload_plugin` |
| **Design Creation** | 3 | `figma_execute` (run Plugin API code), `figma_arrange_component_set`, `figma_set_description` |
| **Design-Code Parity** | 2 | `figma_check_design_parity`, `figma_generate_component_doc` |
| **Visual/Navigation** | 2 | `figma_take_screenshot`, `figma_navigate` |
| **Comments API** | varies | Comment reading/writing tools |
| **MCP Apps** | varies | Interactive UI rendered inline in MCP clients |

### Key Capability: `figma_get_design_system_kit`

Single-call extraction of your entire design system: tokens, component specs, resolved styles, and visual specs. This is the most efficient way to bootstrap an AI agent with full design context.

### Best Practices

- **Use batch operations** for variables: `figma_batch_create_variables` and `figma_batch_update_variables` handle up to 100 items per call (10-50x faster than individual calls).
- **Start with `figma_get_design_system_kit`** for a complete snapshot before drilling into individual components.
- **Use `figma_get_component_for_development`** when you need both the component spec and a visual reference image in one call.
- **Use `figma_check_design_parity`** to verify generated code matches Figma specs -- useful in review loops.
- **NPX mode is strongly recommended** over Remote SSE. Remote mode provides only 22 read-only tools (39% of full capability) and cannot create designs or manage variables.

### Setup (Claude Code)

```bash
claude mcp add figma-console -s user \
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN \
  -e ENABLE_MCP_APPS=true \
  -- npx -y figma-console-mcp@latest
```

Then install the Desktop Bridge plugin in Figma Desktop: Plugins > Development > Import plugin from manifest > select `figma-desktop-bridge/manifest.json`.

---

## 2. Official Figma MCP Server

### Overview

Figma's first-party MCP server, integrated into Dev Mode. Requires a paid Figma plan with Dev Mode access. Available as a remote server (hosted by Figma) or desktop server (runs locally through Figma desktop app).

- **Total tools:** ~14
- **Docs:** https://developers.figma.com/docs/figma-mcp-server/
- **Guide repo:** https://github.com/figma/mcp-server-guide

### Tool List

| Tool | Purpose |
|------|---------|
| `get_design_context` | Structured React + Tailwind representation of a Figma selection. Translatable to any framework via prompts. |
| `get_screenshot` | Visual screenshot of the selection for layout fidelity. |
| `get_variable_defs` | Extract color, spacing, typography, and other token definitions from a selection. |
| `get_metadata` | Sparse XML of layer IDs, names, types, positions, sizes. Lightweight alternative for large designs. |
| `get_code_connect_map` | Map Figma node IDs to actual code component implementations. |
| `add_code_connect_map` | Create and store Figma-to-code mappings. |
| `get_code_connect_suggestions` | Detect potential component linkages between Figma and your codebase. |
| `create_design_system_rules` | Generate rule files to enforce consistent code generation. |
| `generate_figma_design` | Convert live web pages into Figma layers (Claude Code exclusive, rolling out). |
| `get_figjam` | Extract FigJam diagram metadata with screenshots. |
| `generate_diagram` | Create FigJam diagrams from natural language or Mermaid syntax. |
| `whoami` | Authenticated user info, plan type, seat type. |

### Best Practices

- **Use `get_metadata` first for large designs**, then drill into specific nodes with `get_design_context`. This avoids token blowout.
- **Set up Code Connect** to map Figma components to your actual codebase components. Without it, the AI spends significant time searching for matching components or creates duplicates.
- **Use `create_design_system_rules`** to store project-level guidance (naming conventions, file organization, component reuse policies) that persist across sessions.
- **Disable `get_screenshot`** when managing token limits -- images consume significant context.
- **Treat `get_design_context` output as a design representation, not final code.** It outputs React + Tailwind by default but should be translated to your stack via prompts.

### Rate Limits

- Starter plan / View-only seats: Up to 6 tool calls per month (very limited).
- Dev or Full seats on Professional/Organization/Enterprise: Tier 1 REST API rate limits (per-minute).

---

## 3. Official Figma MCP vs. Figma Console MCP -- Comparison

| Dimension | Official Figma MCP | Figma Console MCP |
|-----------|--------------------|-------------------|
| **Provider** | Figma (first-party) | Southleft / TJ Pitre (community) |
| **License** | Proprietary (requires paid plan + Dev Mode) | MIT (open source) |
| **Tool count** | ~14 | 57+ |
| **Read access** | Yes | Yes |
| **Write access** | Limited (Code Connect, rules, diagrams) | Full (create frames, variables, components) |
| **Variable management** | Read-only (`get_variable_defs`) | Full CRUD + batch operations (11 tools) |
| **Code Connect** | Yes (map Figma to code) | No |
| **Design system kit** | No single-call extraction | Yes (`figma_get_design_system_kit`) |
| **Token export formats** | Via prompts | CSS custom properties, Tailwind config, Sass, JSON |
| **Plugin debugging** | No | Yes (console logs, screenshots, reload) |
| **Design creation** | `generate_figma_design` (limited, rolling out) | `figma_execute` (full Plugin API access) |
| **Parity checking** | No | Yes (`figma_check_design_parity`) |
| **Connection** | OAuth via Figma account | Personal access token + Desktop Bridge |
| **Rate limits** | Figma REST API tier | Figma REST API tier (for REST calls) |

### Recommendation for react-craft

Use **both** in tandem:
- **Figma Console MCP** as primary: broader extraction capabilities, design system kit, variable management, parity checking.
- **Official Figma MCP** as fallback/complement: Code Connect integration, `get_metadata` for large designs, `create_design_system_rules` for persistent context.

---

## 4. Anova Figma Plugin -- Structured Component Spec Extraction

### Overview

Anova ("Analysis of Variants") by Nathan Curtis is a Figma plugin that produces deterministic, structured specs from component sets. It is the second generation of the EightShapes Specs plugin.

- **Figma Community:** https://www.figma.com/community/plugin/1549454283615386215/anova
- **Author:** Nathan Curtis (EightShapes)

### What It Extracts

| Data | Description |
|------|-------------|
| **Anatomy** | Hierarchical element tree (containers, text, icons, slots) |
| **Props** | Boolean, string, enum, slot props with defaults and allowed values |
| **Variant analysis** | How structure, styles, and configurations shift across all variants |
| **Styles** | Resolved colors, typography, spacing, effects per variant |

### Output Format

- **YAML or JSON** (user choice)
- Conforms to a published JSON schema
- Deterministic: same input always produces the same output
- No AI guessing -- raw, intentional data only from the Figma asset

### Best Practices for Pipelines

- **Run Anova on each component set** before feeding to the Design Analyst agent. The structured YAML output is far more reliable for code generation than raw Figma API data.
- **Use Anova output as the canonical spec** that the Component Architect and Code Writer consume. It provides the variant-diff analysis that's hard to reconstruct from raw Figma data.
- **Cache Anova output** alongside the Figma file version. Re-run only when the component has been modified.
- **Combine with Figma Console MCP**: use Anova for component-level specs and Figma Console MCP for file-level token extraction.

---

## 5. Extracting Design Tokens from Figma

### Token Types Available (2025/2026)

| Type | Examples |
|------|----------|
| **Color** | Brand colors, semantic colors, theme palettes |
| **Number** | Spacing scale, border radius, opacity, line heights |
| **String** | Font families, labels, configuration values |
| **Boolean** | Feature flags, conditional flows |
| **Alias/Reference** | Theme-switching tokens (light.bg -> gray.100) |
| **Composite/Array** (2025+) | Grouped values: shadows, borders, gradients |
| **Expression** (2026 preview) | Conditional and computed variables |

### Extraction Methods

**Method 1: Figma Console MCP (recommended for bulk extraction)**
```
figma_get_design_system_kit  -> Full system: tokens + components + styles
figma_get_variables          -> All variables with multi-format export
figma_get_styles             -> Color, text, effect styles
```

Export formats: CSS custom properties, Tailwind config, Sass variables, JSON.

**Method 2: Official Figma MCP (recommended for selection-scoped extraction)**
```
get_variable_defs  -> Variables used in the current selection
```

**Method 3: Anova Plugin (recommended for per-component token resolution)**

Extracts resolved style values for each variant, showing exactly which tokens map to which visual properties.

**Method 4: Figma REST API (for automated CI/CD pipelines)**

The `/v1/files/:key` endpoint includes all styles. The Variables API provides programmatic access to variable collections, modes, and values.

### Best Practices

- **Separate token file in Figma**: Keep design tokens in a dedicated Figma file, not embedded in the UI kit. This makes API extraction cleaner and reduces response sizes.
- **Use Figma Variables (not just styles)**: Variables support modes (light/dark, compact/comfortable), aliases, and scoping. Styles are legacy for many token types.
- **Export to W3C Design Tokens format** when possible. This is becoming the industry standard (supported by Tokens Studio and other tools).
- **Map raw values to semantic tokens**: Never let the AI use raw hex/px values. Always resolve to your token names (e.g., `--color-primary` not `#1a73e8`).

---

## 6. Extracting Component Variants and States

### The Problem

A component with 5-6 variants takes about 1 minute to extract. One with 50+ variants can take 5+ minutes. Naive extraction (fetching every variant individually) wastes tokens and time.

### Recommended Approach

**Step 1: Get the variant matrix from Anova**

Anova produces a structured diff of all variants, showing which props change which styles. This is far more token-efficient than extracting each variant individually via MCP.

**Step 2: Get the base component via Figma Console MCP**

```
figma_get_component_for_development  -> Component spec + image
```

**Step 3: Get resolved tokens for the component**

```
figma_get_variables  -> All tokens used by the component
```

**Step 4: Combine into a component brief**

The Design Analyst agent should merge Anova output + MCP token data into a single structured brief that the Code Writer can consume without additional Figma calls.

### State Extraction

Figma does not natively expose interactive states (hover, focus, active, disabled) as separate variants in all cases. Best practices:

- **Look for variant props named "State"** (common convention: Default, Hover, Pressed, Focused, Disabled).
- **Check for Figma annotations/comments** describing state behavior.
- **Use the official MCP `get_design_context`** which includes state information when components follow Figma's interactive component conventions.
- **Fall back to design system documentation** (via Context7 MCP or web search) for state specifications not captured in Figma.

---

## 7. Figma URL Handling

### URL Formats

**File-level URL:**
```
https://www.figma.com/design/{file_key}/{file_name}
```

**Node-level URL (what you want):**
```
https://www.figma.com/design/{file_key}/{file_name}?node-id={node_id}
```

**Legacy format (still works):**
```
https://www.figma.com/file/{file_key}/{file_name}?node-id={node_id}
```

### How MCP Servers Handle URLs

Both MCP servers extract the `file_key` and `node-id` from URLs automatically. You paste the Figma URL into your prompt and the MCP client parses it.

### Best Practices

- **Always use node-level links** (right-click a frame in Figma > "Copy link"). File-level links force the MCP to process the entire file, which is slow and token-expensive.
- **Link to the component set, not individual variants**, when you want variant analysis. The MCP will return all variants in the set.
- **Link to specific frames** when working on a page layout rather than a component. Avoid linking to entire pages.
- **Validate URLs before passing to agents**: Ensure the `node-id` parameter is present. A URL without `node-id` targets the entire file.

### URL Parsing Pattern (for pipeline code)

```typescript
function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error('Invalid Figma URL');

  const fileKey = match[1];
  const nodeIdMatch = url.match(/node-id=([^&]+)/);
  const nodeId = nodeIdMatch ? decodeURIComponent(nodeIdMatch[1]) : undefined;

  return { fileKey, nodeId };
}
```

---

## 8. Token Efficiency -- Minimizing API Calls and Response Sizes

### The Core Problem

Raw Figma API responses can be enormous. A single component can return ~960k tokens of raw JSON, while the actual useful information might be ~67k tokens -- a 15x gap. The `get_design_context` response can exceed 350k tokens, blowing past typical MCP response limits of 25k.

### Strategies

**Strategy 1: Hierarchical fetching (official MCP)**
1. Run `get_metadata` first (lightweight XML: layer IDs, names, types, positions).
2. Identify the specific nodes you need.
3. Run `get_design_context` only on those nodes.

**Strategy 2: Single-call design system kit (Figma Console MCP)**
1. Run `figma_get_design_system_kit` once at pipeline start.
2. Cache the result for the session.
3. Use `figma_get_component` only for components not covered by the kit.

**Strategy 3: Anova-first for components**
1. Run Anova on the component set (produces compact YAML).
2. Use MCP only for tokens and screenshots, not component structure.

**Strategy 4: Disable screenshots when not needed**
- Screenshots consume significant tokens (images are base64-encoded).
- Only request `get_screenshot` or `figma_take_screenshot` for the Visual Reviewer agent, not for the Design Analyst or Code Writer.

**Strategy 5: Scope requests narrowly**
- Always pass a `node-id`, never fetch entire files.
- Request specific tool outputs in prompts: "Get only the variable names and values used in this frame."

**Strategy 6: Cache aggressively**
- Figma file versions are immutable. Cache responses keyed by `(file_key, version, node_id)`.
- Re-fetch only when the file version changes (check via `GET /v1/files/:key/versions`).

### API Rate Limits (Figma REST API, as of late 2025)

Rate limits are per-user, per-minute. Enterprise plans have higher limits. The official MCP on Starter plans is capped at 6 tool calls per month total -- essentially unusable for pipelines.

---

## 9. Monday.com Pipeline Pattern (Real-World Reference)

Monday.com published their production Figma-to-code pipeline architecture, which validates several patterns above:

### Their 11-Node Pipeline

1. **Design data extraction** from Figma MCP
2. **Translation detector** scans text nodes for localization keys
3. **Layout analyzer** infers flex/grid structures from spacing and positioning
4. **Token fetcher** maps raw design values to semantic design tokens via design system MCP
5. **Component identifier** determines which elements are design system components vs. custom
6. **Variant resolver** resolves valid variants and props for system components
7. **CSS planner** for custom components (using tokens, not hardcoded values)
8. **Analytics fetcher** pulls event definitions from internal tools
9. **Accessibility fetcher** retrieves guidelines from design system MCP
10. **Code generation** with full context from all previous steps
11. **Validation** against design system rules

### Key Lesson

> "The problem wasn't that the model was bad. It's that the model had no understanding of what the design system actually was."

Naive "give Figma screenshot to AI" approaches fail because the AI lacks context about which components exist, which props are valid, which tokens must be used, and which accessibility rules are mandatory. Building structured context through a multi-step pipeline is essential.

---

## 10. Summary: Recommended Pipeline Architecture for react-craft

```
User pastes Figma URL (node-level)
    |
    v
[1] Design Analyst agent
    |-- Parse URL -> extract file_key + node_id
    |-- figma_get_design_system_kit (Figma Console MCP) -> cache tokens
    |-- Anova plugin output (YAML) -> component spec with variants
    |-- figma_get_component_for_development -> visual reference
    |-- get_variable_defs (Official MCP) -> selection-scoped tokens
    |-- Merge into structured component brief
    |
    v
[2] Component Architect agent
    |-- Reads component brief (no Figma calls)
    |-- Breaks into atomic parts, defines API
    |
    v
[3] Code Writer agent
    |-- Reads brief + architecture (no Figma calls)
    |-- Generates React components using resolved tokens
    |
    v
[4] Accessibility Auditor + Story Author (parallel, no Figma calls)
    |
    v
[5] Visual Reviewer agent
    |-- figma_take_screenshot (Figma Console MCP) -> Figma reference
    |-- Playwright MCP -> component screenshot
    |-- Compare
    |
    v
[6] Quality Gate (no Figma calls)
```

**Total Figma MCP calls per component: 3-5** (design system kit is cached across components).

---

## Sources

- [Figma Console MCP GitHub Repository](https://github.com/southleft/figma-console-mcp)
- [Figma Console MCP Documentation](https://docs.figma-console-mcp.southleft.com/tools)
- [Figma MCP vs. Figma Console MCP Comparison (Southleft)](https://live-southleft.pantheonsite.io/insights/ai/figma-mcp-vs-figma-console-mcp/)
- [Official Figma MCP Server Introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Official Figma MCP Tools and Prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Figma MCP Server Guide (GitHub)](https://github.com/figma/mcp-server-guide)
- [Guide to the Figma MCP Server (Figma Help)](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Code Connect Integration (Figma Developer Docs)](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/)
- [Figma MCP Collection: Compare Remote and Desktop Servers](https://help.figma.com/hc/en-us/articles/35281385065751-Figma-MCP-collection-Compare-Figma-s-remote-and-desktop-MCP-servers)
- [Anova Figma Plugin (Community)](https://www.figma.com/community/plugin/1549454283615386215/anova)
- [Analysis of Variants (Nathan Curtis)](https://nathanacurtis.substack.com/p/analysis-of-variants-9e440c30b93e)
- [How We Use AI to Turn Figma Designs into Production Code (Monday Engineering)](https://engineering.monday.com/how-we-use-ai-to-turn-figma-designs-into-production-code/)
- [How to Structure Figma Files for MCP (LogRocket)](https://blog.logrocket.com/ux-design/design-to-code-with-figma-mcp/)
- [Design System Mastery with Figma Variables 2025/2026 Playbook](https://www.designsystemscollective.com/design-system-mastery-with-figma-variables-the-2025-2026-best-practice-playbook-da0500ca0e66)
- [Figma REST API Rate Limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Figma MCP: The CTO's Guide to Design-to-Code in 2026](https://alexbobes.com/tech/figma-mcp-the-cto-guide-to-design-to-code-in-2026/)
- [Figma MCP Server Tested: Figma to Code in 2026](https://research.aimultiple.com/figma-to-code/)
