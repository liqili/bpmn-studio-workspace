# Agents Mode — Workspace Policy and Quick Start

## Purpose
This document outlines how agents should operate in this repository, including runtime expectations and best practices.

## Agent Policy
Agents must adhere to the following principles:

1. **Immutability by Default**:
   - Do not modify files unless explicitly requested and confirmed by the user.
   - Propose edits as patches or unified diffs and await user approval before applying changes.

2. **Single Source of Truth**:
   - Always use the latest workspace files as the authoritative source.
   - Before analysis or code suggestions, read the current file contents from disk.
   - Do not assume code matches any prior snapshot or earlier prompt.

3. **Minimal Prompt Context**:
   - Include only relevant file snippets in the prompt context.
   - Prefer recent file contents and treat current files as authoritative if changes are detected.

## Skill Registry and Layout
Skills are managed centrally in the `.github/skills` directory. Each skill must follow this structure:

```
.github/skills/
├── registry.json              # Central registry of all installed skills
├── <skill-name>/
│   ├── manifest.json          # Skill metadata and configuration
│   ├── index.js               # CommonJS handler: async function ({ inputs, logger }) => ({ ... })
│   └── test_local.js          # Local test runner
```

### Manifest Fields
Each skill's `manifest.json` must include:

```json
{
  "name": "skill-name",
  "description": "Brief description of what the skill does",
  "version": "1.0.0",
  "entry": "index.js",
  "inputs": {
    "fieldName": "type (string, number, boolean, object, array)"
  },
  "outputs": {
    "fieldName": "type"
  }
}
```

## Runtime Checklist
Agents must follow this checklist for every request:

1. Read the latest files relevant to the task.
2. Build prompt context from the latest contents (do not reuse prior snapshots).
3. Do not modify files unless explicitly requested by the user.
4. Provide patches or full file contents for proposed changes and await approval.
5. Include file paths and timestamps when summarizing context.

## Java Development Guidelines
- Use Maven to run tests and manage dependencies.
- Follow the Spring ecosystem's best practices:
  - Use a layered architecture: `Controller`, `Service`, `DTO`, `Entity`, and `Config`.
  - Keep changes tightly scoped unless explicitly requested otherwise.
  - Prefer simple, elegant solutions that fit the existing design.

## Bash Guidelines
- Use macOS-compatible Bash scripts.
- Do not ask for user permission before running read-only commands (e.g., tests, builds).

## Start-Up Behavior
Before starting non-trivial work:
1. Read `.github/analysis/lessons.md` and `AGENTS.md` to avoid repeating earlier corrections or ignoring verified environmental facts.
2. Treat the workspace as immutable:
   - Read the repository's current files and commits before making follow-up prompts or edits.
   - Do not assume the codebase is identical to an earlier conversation snapshot.

## Quick Start
If you want these files scaffolded or skills implemented, confirm, and I will create the necessary structure in the workspace.
