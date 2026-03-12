# CE Integration Steps for /init

Reference file for the Compound Engineering detection and config writing steps in `/react-craft:init`. Extracted to keep init.md under 500 lines.

## Step 2i: CE Detection

### Detection Method

Read `~/.claude/plugins/installed_plugins.json` using `Bash(node ...)`:

```javascript
node -e "
  const fs = require('fs');
  const home = require('os').homedir();
  const path = home + '/.claude/plugins/installed_plugins.json';
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const ceKey = Object.keys(data.plugins || {}).find(k => k.startsWith('compound-engineering@'));
    if (ceKey) {
      const entries = (data.plugins[ceKey] || []).filter(e => e.scope === 'user');
      if (entries.length > 0) {
        console.log(JSON.stringify({ installed: true, version: entries[0].version }));
      } else {
        console.log(JSON.stringify({ installed: false }));
      }
    } else {
      console.log(JSON.stringify({ installed: false }));
    }
  } catch(e) {
    console.log(JSON.stringify({ installed: false }));
  }
"
```

Parse the JSON output. If `installed` is `true`, set `CE_DETECTED = true` and record `CE_VERSION`.

**Do NOT use Glob on `~/.claude/plugins/cache/`** — the cache contains stale/orphaned versions from old installs. Only `installed_plugins.json` is authoritative.

### Prompt Logic

- If `CE_DETECTED` and NOT `USE_DEFAULTS` and no `--ce` flag:
  Prompt: `"Compound Engineering v[CE_VERSION] detected. Enable CE integration for enhanced reviews? (y/n)"`

- If `CE_DETECTED` and `USE_DEFAULTS` and no `--ce` flag:
  Skip CE integration. Log: `"CE detected. Run /react-craft:init (without --defaults) to enable CE integration."`

- If `--ce=enabled` flag is set (regardless of `USE_DEFAULTS`):
  Enable without prompting.

- If NOT `CE_DETECTED`:
  Set `CE_ENABLED = false`. Note for summary: `"CE: not detected"`

Record `CE_ENABLED` (boolean) for use in Step 4b.

## Step 4b: Write CE Config

Only runs if `CE_ENABLED` is true. Writes to `$CWD/compound-engineering.local.md` (project root, NOT `.claude/`).

### If `compound-engineering.local.md` exists

1. Read the file.

2. **Validate file size** — if > 50KB, warn and skip CE integration (malformed or unexpected content).

3. **Parse YAML frontmatter** (between the `---` delimiters).
   - If parsing fails: warn `"compound-engineering.local.md has malformed YAML frontmatter. Skipping CE integration."` and stop.
   - Validate `review_agents` is an array of strings (or absent). If it's any other type, warn and skip.
   - Validate each agent name matches `^[a-z0-9-]+$`. Skip any entry that doesn't match.

4. **Add to `review_agents`** (if not already present):
   - `pattern-recognition-specialist`
   - `architecture-strategist`

5. **Add to `plan_review_agents`** (if not already present):
   - `architecture-strategist`
   - `code-simplicity-reviewer`

6. **Handle markdown body:**
   - Check for `<!-- react-craft:start -->` and `<!-- react-craft:end -->` markers.
   - **Marker validation:** Verify exactly one start marker and one end marker exist, with start before end. If this invariant is violated, warn and append a fresh block at the end instead of attempting partial replacement.
   - If valid markers found: replace everything between them (inclusive) with the new block.
   - If no markers found: append the block to the end, preceded by a blank line.

7. Write the updated file.

8. **Read-back verification:** Read the file back and confirm the `<!-- react-craft:start -->` marker is present. If not, warn: `"CE config write may have failed. Check compound-engineering.local.md manually."`

### If `compound-engineering.local.md` does not exist

Create the file with this content:

```markdown
---
review_agents:
  - kieran-typescript-reviewer
  - code-simplicity-reviewer
  - security-sentinel
  - performance-oracle
  - pattern-recognition-specialist
  - architecture-strategist
plan_review_agents:
  - architecture-strategist
  - code-simplicity-reviewer
---

# Review Context

{review_context_block}
```

The default `review_agents` list includes CE's TypeScript project defaults plus react-craft's recommendations. This gives users a working CE setup even if they haven't run CE's own `/setup` skill.

### Review Context Block

The review context is **dynamic**, adapting to what `/init` detected:

```markdown
<!-- react-craft:start -->
## react-craft Integration

This project uses react-craft for Figma-to-component generation.

When reviewing react-craft output in `{SCOPE_DIR}`:
- Check component API against the component's `brief.md`
- Validate design token usage (no hardcoded colors, spacing, typography)
- Verify accessibility audit findings are resolved
- Run visual comparison against Figma if link is available in brief
- Check Story coverage matches all states described in architecture.md
<!-- react-craft:end -->
```

**Conditional lines** (resolve at init time — only include if the detection step found the relevant tool):

- "Validate design token usage" — always include (core react-craft value)
- "Run visual comparison against Figma" — include if Figma MCP was detected in Step 1c
- "Check Story coverage" — include if Storybook was detected in Step 2e

Replace `{SCOPE_DIR}` with the detected components directory.

## Summary Row

Add to the Step 6 summary output, using the existing colon-aligned plain-text format:

```
  CE integration: enabled (2 review agents added)
```

Or if CE was not detected:

```
  CE integration: not detected
```

Or if user declined or `--defaults` skipped:

```
  CE integration: skipped
```

## Security Notes

- `disable-model-invocation: true` on `/init` is a security-critical property. It prevents prompt injection from malicious content in `compound-engineering.local.md`. Do not relax this restriction without re-evaluating injection risks.
- YAML frontmatter from `compound-engineering.local.md` is untrusted input — always validate structure and value types before merging.
- Agent name strings are validated with `^[a-z0-9-]+$` to prevent YAML injection via specially-crafted names.
