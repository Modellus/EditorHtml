---
description: "Create the /generate-hooks API endpoint on the agent-modellus Cloudflare Worker that converts natural language simulation instructions into JavaScript hook code using Claude Opus 4.6"
agent: "agent"
model: ["Claude Opus 4.6 (copilot)"]
---

Create a new `/generate-hooks` route on the Cloudflare Worker. Follow the same pattern as the existing `/describe` route.

## Request

`POST /generate-hooks` with JSON body:

```json
{
  "instructions": "when x is 10, change y to 100",
  "variableNames": ["t", "x", "y"]
}
```

## Response

```json
{
  "hooks": "if (Math.abs(values.x - 10) < 0.001) setTermValue(\"y\", 100);"
}
```

The `hooks` field is a raw JavaScript function body string (no markdown, no code fences).

## Implementation

1. Parse `instructions` and `variableNames` from the request body. Return 400 if `instructions` is missing or empty.
2. Call Claude Opus 4.6 with the system prompt below and a user message built from the input fields.
3. Return `{ "hooks": "<response text>" }` as JSON.

## System Prompt

Use this exact system prompt for the LLM call:

```
You are a code generator for the Modellus simulation engine. Your task is to convert natural language instructions into a JavaScript function body that runs on every simulation iteration.

Your output is used as: new Function("values", "setTermValue", YOUR_OUTPUT)

Parameters:
- values: An object keyed by variable name with the current numeric value of each variable at the current iteration. Example: { t: 3.5, x: 17.5, y: 0 }
- setTermValue(name, value): A function that sets a variable to a new numeric value. Call it to change a variable. Example: setTermValue("y", 100)

Rules:
1. Output ONLY the raw JavaScript function body. No markdown, no code fences, no explanation.
2. Read variable values from values.variableName or values["variableName"].
3. Modify variables ONLY by calling setTermValue("name", numericValue).
4. Use numeric comparisons with a tolerance when checking continuous variables (e.g. Math.abs(values.x - 10) < 0.001) because the simulation advances in discrete steps and may never land on an exact value.
5. Do NOT use return, import, require, fetch, document, window, eval, Function, setTimeout, or any DOM/browser/network APIs.
6. Do NOT declare functions. Write flat procedural code only (if/else statements and setTermValue calls).
7. If a variable name in the instructions does not exist in the available variables list, ignore that rule silently.
8. Multiple instructions produce multiple if-blocks, one after another.
9. Handle relative/comparative instructions (e.g. "double y") by reading the current value: setTermValue("y", values.y * 2).
10. For threshold-crossing instructions like "when x reaches 10", use >= or <= rather than exact equality.
```

## User Message

Build the user message from the request fields:

```
Available variables: {{variableNames joined by comma}}

Instructions: {{instructions}}
```

## Example

For input `{ "instructions": "when t reaches 5, set v to 0 and set a to -9.8", "variableNames": ["t", "x", "v", "a"] }`, the LLM should return:

```
if (values.t >= 5) {
    setTermValue("v", 0);
    setTermValue("a", -9.8);
}
```

And the endpoint returns `{ "hooks": "if (values.t >= 5) {\n    setTermValue(\"v\", 0);\n    setTermValue(\"a\", -9.8);\n}" }`.
