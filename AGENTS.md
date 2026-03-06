# Coding Standards

These rules apply to all code changes in this repository.

## Formatting
- Do not add unnecessary line breaks inside functions.
- Keep function bodies compact and readable without artificial vertical spacing.

## Function Structure
- Do not declare helper functions inside other functions.
- In classes, helper functions must be declared at the class root level as methods.

## Conditionals
- For single-statement conditions, do not use braces.
- Single-statement conditions must still use a line break:
  - `if (condition)`
  - `    doSomething();`

## Naming
- Variable names must be meaningful and complete.
- Avoid abbreviations unless they are universally standard and unambiguous.

## API Fields
- Use only canonical API field names.
- Do not implement fallback mapping for alternative field names.
- Do not add normalization or coercion logic for API values.
- Do not normalize IDs or convert types for comparisons.
- For lookup `byKey`, call the API client method that fetches by ID.

## Comments
- Do not add comments.

## DOM Generation
- When generating DOM in JavaScript, use strings with string interpolation.
- Prefer `innerHTML` or `insertAdjacentHTML` for markup insertion.
- Do not use `document.createElement` + `appendChild` for markup construction.

## UI Control Contracts
- In UI control callbacks, trust the control contract for provided arguments.
- Do not use defensive fallback chains like `x && x.y ? x.y : x`.
- Do not use fallback object extraction chains like `a && a.b && a.b.c ? a.b.c : a`.
- Prefer optional chaining (`?.`) instead of `&&` null-check chains.
- Do not add defensive validation guards in UI event handlers (e.g. `!event`, `!event.itemData`, `!data`, `!id`).
- In UI event handlers, read callback data directly from the control contract.
