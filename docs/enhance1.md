# Text Diff Tool – Improvement Suggestions

The current tool already has several strengths:

* inline visualization is compact,
* changes are easy to spot,
* surrounding context is preserved,
* and it works well for quick human inspection.

The tool feels especially useful for:

* markdown,
* AI-generated text comparison,
* prompt iteration,
* config diffs,
* documentation edits,
* and semi-structured text.

However, several improvements would significantly improve readability and developer UX.

---

# Priority 1 — Reduce Visual Noise

## Problem

The diff is currently too granular in many cases.

Small edits like capitalization or spacing generate excessive fragmentation.

Example:

```diff id="bk6l7k"
- m+ M
- đ+ Đ
```

This creates visual noise and makes larger diffs difficult to scan.

---

## Suggested Improvements

### 1. Collapse trivial edits

Introduce configurable rules such as:

```ts id="7o18qv"
ignoreCase: true
ignoreWhitespace: true
ignorePunctuation: false
```

This allows developers to tune diff sensitivity depending on use case.

---

### 2. Merge contiguous edits

Current output often breaks a single logical edit into many tiny fragments.

### Current

```diff id="rjlwmx"
- t+ T  hì chẳng qua em đang chưa muốn thôi anh
```

### Better

```diff id="zv4d44"
- thì chẳng qua em đang chưa muốn thôi anh
+ Thì chẳng qua em đang chưa muốn thôi anh
```

This dramatically improves scanability.

---

# Priority 2 — Normalize Input Before Diffing

## Problem

Whitespace and formatting inconsistencies generate too much noise.

Examples:

```diff id="7x0l4f"
- ,   anh thì muốn- ,   được tự do
```

These changes are technically correct but often not meaningful.

---

## Suggested Preprocessing

Before tokenization/diffing:

* collapse repeated spaces,
* normalize Unicode,
* normalize line endings,
* normalize quote styles,
* optionally trim trailing whitespace.

Example:

```ts id="1s2j6f"
normalizeWhitespace(text)
normalizeUnicode(text)
normalizeLineEndings(text)
```

This should be configurable because some use cases require exact diffs.

---

# Priority 3 — Multi-Level Diff Strategy

## Problem

Character-level diffing is too aggressive as a default strategy.

For most developer workflows, humans think in:

* lines,
* words,
* phrases,
* blocks.

Not individual characters.

---

## Suggested Strategy

Use hierarchical diffing:

```txt id="m7l4yv"
Line → Word → Character
```

Recommended behavior:

1. detect changed lines first,
2. diff words within changed lines,
3. fallback to character-level only when necessary.

This preserves precision while remaining readable.

---

# Priority 4 — Improve Rendering / UX

## Problem

The current inline format is compact but becomes difficult to scan for larger diffs.

Especially when:

* many small edits exist,
* lines are long,
* or multiple adjacent edits occur.

---

## Suggested Rendering Modes

### 1. Compact Inline Mode

Best for:

* terminals,
* logs,
* quick inspection.

---

### 2. Human Readable Mode

Best for:

* markdown,
* prose,
* generated text,
* AI output comparison.

Example:

```diff id="yjlwm4"
- em mới biết bỏ thuốc nhở?
+ anh mới biết bỏ thuốc nhở?
```

instead of fragmented character diffs.

---

### 3. Side-by-Side Mode (future)

Especially useful for:

* documentation,
* prompt engineering,
* generated code explanations.

---

# Priority 5 — Better Classification of Changes

## Problem

All edits currently appear visually equivalent.

But developers mentally categorize edits differently.

---

## Suggested Categories

Distinguish:

* whitespace-only edits,
* capitalization-only edits,
* punctuation edits,
* word replacements,
* structural changes,
* moved blocks.

Example:

```txt id="jlwmhf"
[Whitespace]
[Case Change]
[Replacement]
[Insertion]
[Deletion]
```

This improves cognitive parsing significantly.

---

# Priority 6 — Diff Profiles / Modes

Different workflows need different diff sensitivity.

---

## Recommended Modes

### 1. Strict Mode

Exact diff.
Useful for:

* code generation validation,
* snapshot testing,
* formatting verification.

---

### 2. Smart Text Mode

Ignore low-signal edits.
Useful for:

* docs,
* markdown,
* prompts,
* AI-generated text.

---

### 3. Semantic Mode (future)

Optional AI-assisted layer:

* summarize changes,
* detect rewritten sections,
* classify intent of edits,
* explain major transformations.

Especially useful for:

* prompt engineering,
* long-form documentation,
* generated content review.

---

# Most Important Architectural Recommendation

The biggest improvement would come from:

```txt id="o86avd"
Moving from character-first diffing
→ to hierarchical structure-aware diffing
```

Recommended order:

```txt id="h94oqk"
Line → Word → Character
```

Character-level diff should be a refinement step, not the default foundation.

That single change would greatly improve:

* readability,
* scan speed,
* developer ergonomics,
* and overall perceived quality of the tool.
