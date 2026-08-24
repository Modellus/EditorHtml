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

## Running Tests

The suite is 807 tests across 69 spec files. Never run all of it to check one change.

- While iterating on a failure, run `npx playwright test --last-failed`.
- After a change, run only the specs covering the area touched, by path:
  `npx playwright test tests/term-units.spec.js`. Narrow to one case with `-g "<test name>"`.
- Run the full suite once, at the end, and run it in the background rather than waiting on it.
  CI runs it too, sharded four ways, on every push and pull request.
- Always pass `--reporter=line`. Never open the HTML report.
- `--only-changed` does not work here: the specs reach the app over HTTP and do not import
  `scripts/`, so Playwright cannot map a source change to a spec. Choose specs by name.
- Before reading a failure as a regression, run that spec alone. `main` is green, but a handful of
  specs are load-sensitive and can lose a race on a busy machine; CI retries twice for that reason.
- Never let a test reach the real API. Answer the endpoint with `page.route`, the way the catalogue
  specs do: a test that talks to the live service is decided by what the service happens to hold.

The config runs `fullyParallel` at 8 workers: the full suite takes ~5-7 minutes, a single spec seconds.
If a spec genuinely shares state across its tests, give that one file
`test.describe.configure({ mode: 'serial' })` rather than turning off the global setting.

## Waiting in Tests

- Do not add `page.waitForTimeout()`. A fixed sleep is the main cause of slowness and of the
  suite's flakiness under load — it either wastes time or loses the race.
- Wait on the condition instead: `page.waitForFunction()`, `expect(locator).toBeVisible()`,
  or `expect(...).toPass()` / `expect.poll()` around an assertion that has to settle.
- When editing a spec that already sleeps, convert the sleeps in the part being touched.
