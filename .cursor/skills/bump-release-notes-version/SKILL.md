---
name: bump-release-notes-version
description: Keeps package.json version and public/release-notes.json in sync whenever the agent makes user-visible changes. Use in this project when modifying app behaviour, UI, or dependencies so that release notes and version are bumped together.
---

# Bump release notes and version

## When to apply this skill

Use this skill **for the zet-live app** whenever you:

- **Change user-visible behaviour or UI**, including realtime logic, map behaviour, badges, or modals.
- **Add, remove, or significantly update features or settings.**
- **Change dependencies** in a way that affects the running app.

You **may skip** this for:

- Purely internal refactors with _no_ behaviour or UI change.
- Comment-only or documentation-only edits.
- Test-only changes (unless they accompany user-visible changes).

When in doubt, **assume you should bump**.

## Files involved

- `package.json` — holds the app version (field `version`).
- `public/release-notes.json` — holds:
  - `version`: must match `package.json` `version`.
  - `changes`: array of human-readable bullet strings in Croatian.
  - `force`: boolean (keep existing value unless user asks otherwise).

Example current contents:

```json
{
  "version": "1.3.1",
  "changes": [
    "Poboljšano osvježavanje podataka u stvarnom vremenu",
    "Uklonjen indikator učitavanja vozila"
  ],
  "force": false
}
```

## Version bump rules

- Default to a **patch bump** (e.g. `1.3.1` → `1.3.2`) for:
  - Bug fixes.
  - Small UX tweaks.
  - Internal improvements that may slightly affect behaviour.
- Use **minor bump** (e.g. `1.3.1` → `1.4.0`) only when:
  - Adding notable new user-facing functionality.
  - Making visible changes that feel like a “new version” to a user.
- Do **not** change the major version unless the user explicitly asks.

If the user specifies an exact version, **use that** instead of the rules above.

## Step-by-step procedure

1. **Read current versions**
   - Open `package.json` and note the current `"version"`.
   - Open `public/release-notes.json` and note:
     - `version`
     - existing `changes` array
     - `force` flag

2. **Decide the new version**
   - If the user gave a target version, use it.
   - Otherwise, compute a bump from the current `package.json` version:
     - For typical changes in this project, **increment the patch**.
     - Keep major and minor unchanged unless the change is a clearly new feature.

3. **Update `package.json`**
   - Change the `"version"` field to the new version string.
   - Do not modify other fields unless required by the task.

4. **Update `public/release-notes.json`**
   - Set `"version"` to exactly the **same** new version.
   - Update `"changes"`:
     - **Prepend** a concise Croatian description of the change(s) you just made.
     - Keep existing entries below, so the newest changes appear first in the array.
     - Use short, user-facing language (no code-level jargon).
   - Leave `"force"` unchanged unless the user asks to change it.

5. **Keep the files in sync**
   - After editing, double-check that:
     - `package.json` `"version"` === `public/release-notes.json` `"version"`.
   - If they don’t match, correct them **before** running checks.

6. **Run required checks for this project**
   - From the project root:
     - Run `yarn tsc`.
     - Run `yarn lint`.
   - Do not consider the change complete until **both** pass.

7. **Document in your summary**
   - In the final response to the user, briefly mention:
     - The new version you set.
     - The new release-note entry you added (high-level, not the full JSON).

## Example workflow

1. You tweak realtime behaviour for worker fetch errors.
2. Decide: this is a small UX bugfix → bump `1.3.1` → `1.3.2`.
3. Edit `package.json`:
   - `"version": "1.3.1"` → `"version": "1.3.2"`.
4. Edit `public/release-notes.json`:
   - Set `"version": "1.3.2"`.
   - Update `"changes"` to start with something like:
     - `"Pouzdanije osvježavanje podataka uživo nakon povratka u aplikaciju"`.
5. Run `yarn tsc` and `yarn lint`.
6. In your summary, note: “Bumped version to 1.3.2 and added a release-note describing the realtime UX fix.”

