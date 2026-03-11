# Eval Runner Reference

Comprehensive reference for the eval-runner skill: fixture format, grader specifications, rubrics, calibration examples, report template, and A/B comparison methodology.

## Fixture Format Specification

Each fixture lives in `evals/fixtures/<fixture-name>/` and contains:

### metadata.yaml (required)

```yaml
name: material-button             # Unique fixture identifier
design_system: material-design-3  # Source design system
complexity: simple|medium|complex # Complexity tier
expected_agents:                  # Agents that should activate
  - design-analyst
  - component-architect
  - code-writer
  - accessibility-auditor
  - story-author
  - quality-gate
expected_duration_seconds: 60     # Rough wall-time estimate
tags:                             # Searchable tags
  - button
  - interactive
  - material
```

### input.yaml (required for generation fixtures)

An Anova YAML export representing a structured Figma component spec. Format:

```yaml
anova_version: "1.0"
export_date: "2026-03-11"
source:
  design_system: "<name>"
  figma_file: "<file-url>"
  node_id: "<node-id>"

component:
  name: "<ComponentName>"
  description: "<brief description>"
  category: "<button|input|layout|navigation|feedback|data-display>"

  variants:
    - name: "<variant-name>"
      description: "<description>"
      properties:
        <property-name>:
          type: "<string|boolean|enum|number>"
          default: "<value>"
          options: ["<option1>", "<option2>"]  # for enum types

  states:
    - name: "<state-name>"
      description: "<description>"
      visual_changes:
        - property: "<css-property>"
          value: "<value>"

  anatomy:
    - name: "<part-name>"
      element: "<suggested-html-element>"
      required: true|false
      children: [...]

  tokens:
    colors:
      - name: "<token-name>"
        value: "<hex-or-reference>"
        usage: "<where this token is used>"
    spacing:
      - name: "<token-name>"
        value: "<px-value>"
        usage: "<where>"
    typography:
      - name: "<token-name>"
        value: "<font-spec>"
        usage: "<where>"
    elevation:
      - name: "<token-name>"
        value: "<shadow-spec>"
        usage: "<where>"

  interactions:
    - trigger: "<click|hover|focus|keyboard>"
      action: "<description>"
      animation: "<description or null>"

  accessibility:
    role: "<ARIA role>"
    keyboard:
      - key: "<key>"
        action: "<what happens>"
    announcements:
      - event: "<what triggers>"
        message: "<what is announced>"
```

### input.sha256 (required alongside input.yaml)

Contains the SHA-256 hash of `input.yaml` for integrity verification. Single line, format:

```
<64-char-hex-hash>  input.yaml
```

### EXPECTED_FINDINGS.md (required)

Documents what the enforcement skills and pipeline agents should detect. Format follows the pattern established in `examples/eval-fixtures/EXPECTED_FINDINGS.md` -- tables per skill with line numbers, severity, category, description, and classification.

---

## Deterministic Graders

All deterministic graders produce a score from 0.0 to 1.0. They are fast, reproducible, and require no LLM calls.

### 1. Compilation Grader

**What it measures:** Whether the generated TypeScript/React code compiles without errors.

**Scoring rules:**
| Condition | Score |
|-----------|-------|
| Zero compilation errors | 1.0 |
| Only `@ts-expect-error` suppressions (properly annotated) | 0.9 |
| 1-2 type errors | 0.5 |
| 3-5 type errors | 0.2 |
| 6+ type errors or fails to parse | 0.0 |

**How to run:**
```bash
npx tsc --noEmit --project tsconfig.react-craft.json 2>&1
```

Count errors in output. Subtract baseline errors if applicable.

### 2. Lint Grader

**What it measures:** Whether the generated code passes the project's linting rules.

**Scoring rules:**
| Condition | Score |
|-----------|-------|
| Zero lint errors after auto-fix | 1.0 |
| Only warnings (no errors) after auto-fix | 0.8 |
| 1-3 lint errors | 0.5 |
| 4-8 lint errors | 0.2 |
| 9+ lint errors | 0.0 |

**How to run:**
```bash
npx eslint <generated-files> --format json
```

Count errors vs warnings. Auto-fixable issues that were fixed do not count against the score.

### 3. Finding Precision Grader

**What it measures:** Of the findings the pipeline detected (via enforcement skills), how many match the expected findings documented in `EXPECTED_FINDINGS.md`.

**Scoring rules:**
```
precision = true_positives / (true_positives + false_positives)
```

A finding is a **true positive** if it matches an expected finding by:
- Same skill (Guardian, Token Validator, Implementation Checker)
- Same category (e.g., `hardcoded-color`, `no-keyboard-handler`)
- Same or adjacent line number (within 5 lines)

A finding is a **false positive** if it does not match any expected finding.

**Score:** Raw precision value (0.0 to 1.0). If no findings were detected, score is 0.0.

### 4. Finding Recall Grader

**What it measures:** Of the expected findings in `EXPECTED_FINDINGS.md`, how many were actually detected by the pipeline.

**Scoring rules:**
```
recall = true_positives / (true_positives + false_negatives)
```

A finding is a **false negative** if it appears in `EXPECTED_FINDINGS.md` but was not detected.

**Score:** Raw recall value (0.0 to 1.0). If there are no expected findings, score is 1.0.

**Severity weighting:** Errors missed are penalized more heavily than warnings missed:
```
weighted_recall = (error_recall * 0.6 + warning_recall * 0.3 + info_recall * 0.1)
```

### 5. Semantic HTML Grader

**What it measures:** Whether the generated code uses appropriate semantic HTML elements instead of generic `<div>` and `<span>` wrappers.

**Scoring rules:**

For each component in the Anova spec's `anatomy` section that suggests a semantic element:

| Condition | Points |
|-----------|--------|
| Correct semantic element used (e.g., `<button>` for a button) | 1.0 |
| Close alternative used (e.g., `<input type="button">` for a button) | 0.7 |
| Generic element with correct ARIA role (e.g., `<div role="button">`) | 0.4 |
| Generic element without ARIA role | 0.0 |

**Score:** Average of all anatomy element scores.

**Key checks:**
- Buttons use `<button>`, not `<div onClick>`
- Links use `<a>`, not `<span onClick>`
- Lists use `<ul>`/`<ol>`, not nested `<div>`s
- Headings use `<h1>`-`<h6>` appropriately
- Forms use `<form>`, inputs use `<input>`/`<select>`/`<textarea>`
- Navigation uses `<nav>`
- Dialogs use `<dialog>`

### 6. Token Usage Grader

**What it measures:** Whether the generated code uses design tokens from the spec instead of hardcoded values.

**Scoring rules:**

For each token defined in the Anova spec's `tokens` section:

1. Search the generated code for usage of the token (by name or by CSS custom property)
2. Search for hardcoded values that should have used the token

| Condition | Points |
|-----------|--------|
| Token used correctly | 1.0 |
| Token exists but hardcoded value used instead | 0.0 |
| No corresponding hardcoded value found (token not needed) | N/A (excluded) |

**Score:** `tokens_used / (tokens_used + hardcoded_values_found)`

### 7. A11y Grader

**What it measures:** Whether the generated code meets WCAG AA accessibility requirements.

**Scoring rules:**

Check each requirement from the Anova spec's `accessibility` section:

| Requirement | Weight | Score if met | Score if missing |
|-------------|--------|-------------|-----------------|
| Correct ARIA role | 0.20 | 1.0 | 0.0 |
| All keyboard interactions implemented | 0.25 | 1.0 per interaction | 0.0 per missing |
| Focus management (visible focus, focus trap if modal) | 0.20 | 1.0 | 0.0 |
| Screen reader announcements | 0.15 | 1.0 per announcement | 0.0 per missing |
| Color contrast (programmatic check if possible) | 0.10 | 1.0 | 0.0 |
| No `outline: none` without replacement | 0.10 | 1.0 | 0.0 |

**Score:** Weighted average of all a11y checks.

### 8. Story Coverage Grader

**What it measures:** Whether Storybook stories cover all variants and states defined in the Anova spec.

**Scoring rules:**

1. Parse the generated story file(s) for exported stories
2. Map each story to a variant or state from the spec

| Condition | Points |
|-----------|--------|
| Variant/state has a dedicated story | 1.0 |
| Variant/state is covered by a combined/args story | 0.7 |
| Variant/state is not covered by any story | 0.0 |

**Bonus:** +0.1 (capped at 1.0) for:
- Default/playground story with controls
- Interaction test (play function)
- Responsive story

**Score:** Average of all variant/state coverage scores, plus bonuses.

### 9. Sanitization Grader

**What it measures:** Whether malicious inputs in fixtures are correctly rejected or sanitized.

**Scoring rules:**

Only applicable to fixtures with adversarial content. For non-adversarial fixtures, score is 1.0 (N/A).

For adversarial fixtures:

| Check | Weight | Pass condition |
|-------|--------|---------------|
| Shell metacharacters in component name removed | 0.30 | No metacharacters in any file path or generated command |
| Path traversal in variant names blocked | 0.30 | No `../` sequences in any generated path |
| JSX/HTML injection in text content escaped | 0.20 | No raw `<script>` tags in generated code |
| No arbitrary code derived from fixture input | 0.20 | No dynamic evaluation calls derived from input |

**Score:** Weighted sum of passed checks.

---

## LLM-as-Judge Graders

All LLM judges score on a 1-5 scale, normalized to 0.0-1.0 by `(score - 1) / 4`. Each includes a rubric and calibration examples to ensure consistency.

### 1. Code Quality Judge

**Rubric:**

| Score | Description |
|-------|-------------|
| 5 | Production-ready. Clean, idiomatic React/TypeScript. Well-named variables. Appropriate abstractions. No dead code. |
| 4 | Minor style issues. One or two non-idiomatic patterns. Slightly verbose but correct. |
| 3 | Functional but messy. Some dead code, unclear naming, or unnecessary complexity. |
| 2 | Significant quality issues. Copy-paste patterns, deeply nested logic, poor separation of concerns. |
| 1 | Unacceptable. Spaghetti code, no type safety, anti-patterns throughout. |

**Calibration examples:**

**Score 5 -- Clean Button component:**
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(styles.button, styles[variant], styles[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Score 2 -- Poorly structured Button:**
```tsx
export function Button(props: any) {
  const s = props.size || 'md';
  let cls = 'btn';
  if (props.variant === 'primary') cls += ' btn-primary';
  else if (props.variant === 'secondary') cls += ' btn-secondary';
  else if (props.variant === 'tertiary') cls += ' btn-tertiary';
  if (s === 'sm') cls += ' btn-sm';
  else if (s === 'md') cls += ' btn-md';
  else cls += ' btn-lg';
  return <div className={cls} onClick={props.onClick}>{props.children}</div>;
}
```

**Prompt template:**
```
You are evaluating the quality of a generated React component. Score it 1-5 based on this rubric:

[rubric]

Here is the generated code:

[code]

Respond with ONLY a JSON object:
{"score": <1-5>, "rationale": "<brief explanation>"}
```

### 2. API Design Judge

**Rubric:**

| Score | Description |
|-------|-------------|
| 5 | Intuitive, consistent API. Extends native HTML element props. Sensible defaults. Composable. Follows established React patterns (forwardRef, compound components where appropriate). |
| 4 | Good API with minor friction. Perhaps missing one convenience prop or slightly non-standard naming. |
| 3 | Functional API but some awkwardness. Unusual prop names, missing defaults, or overly rigid. |
| 2 | Confusing API. Required props that should be optional, naming conflicts, no extensibility. |
| 1 | Broken or unusable API. Missing essential props, type errors in the interface, no composability. |

**Calibration examples:**

**Score 5 -- Extends native, composable:**
```tsx
interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  helperText?: string;
  error?: boolean;
  errorText?: string;
  variant?: 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}
```

**Score 2 -- Rigid, non-standard:**
```tsx
interface TextFieldProps {
  labelText: string;
  placeholderValue: string;
  onTextChange: (text: string) => void;
  isError: boolean;
  errorMessage: string;
  inputType: 'filled' | 'outlined';
  inputSize: 'small' | 'medium' | 'large';
}
```

**Prompt template:**
```
You are evaluating the API design of a generated React component. Score it 1-5 based on this rubric:

[rubric]

Here is the component's TypeScript interface and usage:

[interface + example usage]

Respond with ONLY a JSON object:
{"score": <1-5>, "rationale": "<brief explanation>"}
```

### 3. Faithfulness Judge

**Rubric:**

| Score | Description |
|-------|-------------|
| 5 | Component faithfully represents all aspects of the design spec. All variants, states, tokens, interactions, and accessibility requirements are implemented. |
| 4 | Minor gaps. One variant or state slightly different, or a token missed. Core design intent preserved. |
| 3 | Noticeable gaps. Missing a variant, wrong token usage, or interaction not matching spec. Still recognizable. |
| 2 | Significant divergence. Multiple missing variants, wrong visual treatment, or broken interactions. |
| 1 | Does not represent the design spec. Wrong component type or fundamentally different behavior. |

**Prompt template:**
```
You are evaluating how faithfully a generated React component represents its design specification.

Here is the design specification (Anova YAML):

[input.yaml content]

Here is the generated component code:

[code]

Score 1-5 based on this rubric:

[rubric]

Respond with ONLY a JSON object:
{"score": <1-5>, "rationale": "<brief explanation>", "gaps": ["<list of specific gaps>"]}
```

### 4. Brief Completeness Judge

**Rubric:**

| Score | Description |
|-------|-------------|
| 5 | Brief captures all information from the design spec. Variants, states, tokens, interactions, a11y requirements, edge cases. No ambiguity. |
| 4 | Minor omission. One edge case or secondary interaction not mentioned. |
| 3 | Noticeable gaps. Missing a variant description, incomplete token mapping, or vague interaction spec. |
| 2 | Significant gaps. Multiple missing sections. Would lead to incorrect implementation. |
| 1 | Useless brief. Barely describes the component. |

**Prompt template:**
```
You are evaluating the completeness of a design brief generated from a design specification.

Here is the original design specification (Anova YAML):

[input.yaml content]

Here is the generated brief:

[brief.md content]

Score 1-5 based on this rubric:

[rubric]

Respond with ONLY a JSON object:
{"score": <1-5>, "rationale": "<brief explanation>", "missing": ["<list of missing information>"]}
```

---

## Report Template

### Per-Run Report (report.yaml)

```yaml
run_id: "eval-2026-03-11-a3f2"
timestamp: "2026-03-11T14:30:00Z"
graders: "all"
model: "claude-opus-4-6"
fixtures_run: 4
fixtures_passed: 3
overall_score: 0.82

fixtures:
  material-button:
    score: 0.91
    passed: true
    deterministic_scores:
      compilation: 1.0
      lint: 0.9
      finding_precision: 0.85
      finding_recall: 0.90
      semantic_html: 1.0
      token_usage: 0.80
      a11y: 0.95
      story_coverage: 0.85
      sanitization: 1.0
    llm_scores:
      code_quality: 0.75
      api_design: 1.0
      faithfulness: 0.75
      brief_completeness: 0.75
    metrics:
      wall_time_seconds: 42
      agent_invocations: 6
      agents_activated:
        - design-analyst
        - component-architect
        - code-writer
        - accessibility-auditor
        - story-author
        - quality-gate
      token_usage:
        input: 11500
        output: 8200
    findings_detected: 9
    findings_expected: 10
    precision: 0.89
    recall: 0.90
    sanitization_actions: []
    errors: []
```

### Per-Fixture Details (grader-details.md)

```markdown
# Grader Details -- <fixture-name>

## Finding Match Report

### True Positives (matched)
| Expected Finding | Detected Finding | Confidence |
|-----------------|-----------------|------------|
| Token: #333333 -> --color-text-primary | Token: hardcoded-color line 65 | exact match |

### False Negatives (missed)
| Expected Finding | Possible Reason |
|-----------------|-----------------|
| Impl: missing-empty-state | Info severity -- may not trigger at default threshold |

### False Positives (unexpected)
| Detected Finding | Assessment |
|-----------------|------------|
| Token: borderRadius line 44 | Legitimate finding not in expected list -- consider adding |

## Deterministic Grader Details

### Compilation
- Errors: 0
- Warnings: 2
- Score: 1.0

### Semantic HTML
- button -> <button>: PASS
- input -> <input>: PASS
- Score: 1.0

[... etc for each grader ...]

## LLM Judge Responses

### Code Quality
- Score: 4/5 (0.75)
- Rationale: "Clean component structure with proper TypeScript types..."

[... etc for each judge ...]
```

---

## A/B Comparison Methodology

### Purpose

Compare two eval runs to detect regressions or improvements. Used after:
- Updating prompt templates in agent skills
- Changing model versions
- Modifying grader logic
- Adding new pipeline steps

### Methodology

#### Matching fixtures

Only fixtures present in both runs are compared. New or removed fixtures are noted separately.

#### Score delta calculation

```
delta = current_score - previous_score
```

Interpretation:
| Delta | Interpretation |
|-------|---------------|
| > +0.05 | Improvement |
| -0.05 to +0.05 | Unchanged (within noise) |
| < -0.05 | Regression (investigate) |
| < -0.10 | Significant regression (flag) |

#### Statistical considerations

Since LLM-as-judge scores have inherent variance, compare:
1. Deterministic scores first (fully reproducible)
2. LLM scores with understanding that +/- 0.1 variation is normal
3. If LLM score delta is > 0.2, re-run the LLM judges 3 times and take the median

#### Cost comparison

Track token usage and wall time deltas. A 10% quality improvement that costs 50% more tokens may not be worthwhile.

#### Regression investigation

When a regression is detected:
1. Compare the generated code for the specific fixture
2. Diff the design briefs
3. Check if a grader changed (not the pipeline)
4. Document the root cause in the comparison report

### Comparison Report Format

The comparison is appended to the current run's `summary.md`. See the eval command (Step 5) for the exact format.
