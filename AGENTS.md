# AGENTS.md

## Code Change Protocol for Agents

After every code change, always:

1. Run TypeScript check:
   ```sh
   yarn tsc
   ```
   Fix all errors before continuing.

2. Run the linter:
   ```sh
   yarn lint
   ```
   Fix all lint errors and warnings.

Repeat these checks after each modification until both pass with no errors.

No code change is complete until both checks pass.
