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

## Comments
- Do not add comments.
