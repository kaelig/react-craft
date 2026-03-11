---
name: i18n-checker
description: Detects hardcoded user-facing strings that should use internationalization (i18n). Suggests replacements using the project's i18n framework. Use when checking i18n compliance, or when user says "check i18n", "find hardcoded strings", or "internationalization audit".
user-invocable: false
allowed-tools: Read, Glob, Grep
---

# i18n Checker

You detect hardcoded user-facing strings in UI components and suggest i18n replacements.

This is an example custom skill for the react-craft audit pipeline. To use it, add it to your `react-craft.config.yaml`:

```yaml
pipeline:
  - skill: custom
    path: "examples/custom-skills/i18n-checker/SKILL.md"
    config:
      default_locale: "en-US"
      frameworks: ["react-intl", "i18next"]
```

## Quick Start

1. **Read target files** in scope
2. **Detect hardcoded strings** in user-facing contexts
3. **Suggest i18n replacements** using the project's framework
4. **Output findings** in the standard react-craft format

## Instructions

### Step 1: Determine i18n Framework

Check the pipeline config passed by the orchestrator for `frameworks`. If not provided, detect from the project:

- `react-intl` — look for `import { FormattedMessage } from 'react-intl'`
- `i18next` / `react-i18next` — look for `import { useTranslation } from 'react-i18next'`
- `vue-i18n` — look for `$t(` or `useI18n`
- `next-intl` — look for `import { useTranslations } from 'next-intl'`

### Step 2: Scan for Hardcoded Strings

Look for hardcoded strings in user-facing contexts:

| Context | Pattern | Example |
|---|---|---|
| JSX text content | `<p>Hello world</p>` | Text between JSX tags |
| Placeholder | `placeholder="Search..."` | Input placeholders |
| aria-label | `aria-label="Close dialog"` | Accessibility labels |
| title | `title="Delete item"` | Tooltip text |
| alt | `alt="User avatar"` | Image descriptions |
| Button text | `<button>Submit</button>` | Action labels |
| Error messages | `"Something went wrong"` | String literals in error UI |
| Heading text | `<h1>Dashboard</h1>` | Page/section headings |

### Step 3: Filter False Positives

**DO NOT flag:**
- Import paths and module names
- CSS class names and style values
- HTML attribute names
- `data-testid`, `data-cy`, and similar test selectors
- `console.log` and debug strings
- Enum values and constants (ALL_CAPS)
- URLs, file paths, and technical identifiers
- Single characters or empty strings
- Strings that are already i18n keys (contain dots: `"common.submit"`)
- Strings inside comments

### Step 4: Suggest Replacements

Based on the detected framework:

**react-intl:**
```tsx
// Before
<p>Welcome back</p>
// After
<FormattedMessage id="dashboard.welcomeBack" defaultMessage="Welcome back" />
```

**i18next / react-i18next:**
```tsx
// Before
<p>Welcome back</p>
// After
<p>{t('dashboard.welcomeBack')}</p>
```

**Key naming convention:** Use dot-separated paths based on component/feature name:
`{feature}.{context}.{description}` -> `checkout.form.submitButton`

## Output Format

```
## i18n Checker Results

### src/components/TaxCategoryPicker.tsx

[W] line 70 — hardcoded-string
  Found: hardcoded text "Select tax category..."
  Suggestion: Replace with t('taxCategory.placeholder') or <FormattedMessage id="taxCategory.placeholder" />
  Confidence: 90%

[W] line 97 — hardcoded-string
  Found: placeholder="Search categories..."
  Suggestion: Replace with placeholder={t('taxCategory.searchPlaceholder')}
  Confidence: 95%

[I] line 105 — hardcoded-string
  Found: hardcoded text in group header (dynamic from data — may be server-translated)
  Confidence: 40%
  Note: Check if group names come from the API already translated

### Summary
- Scanned 1 file, found 3 hardcoded strings
- 2 high-confidence (should fix)
- 1 low-confidence (needs review)
```

## Guidelines

- Prefer precision over recall — don't flag technical strings
- Suggest key names that follow the project's existing i18n key convention
- When the string comes from data (API response), note that translation may happen server-side
- Respect the `default_locale` config to determine what language the hardcoded strings are in
- This skill is pipeline-compatible: it accepts files in scope and outputs standard findings
