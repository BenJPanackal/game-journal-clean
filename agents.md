# Agents

**Edit this file** whenever you want to change how AI assistants should behave on this project. Cursor loads it automatically via `.cursor/rules/agents-md.mdc`—no need to duplicate the same text in other rule files.

## Git: commit and push after changing this file

If **you** (the agent) **create or update** `AGENTS.md`—including when acting as the agent that maintains agent instructions—**finish by publishing the change to GitHub** unless the user explicitly asked you not to:

1. `git add` `AGENTS.md` and any related files you changed in the same task (for example `.cursor/rules/agents-md.mdc`).
2. `git commit` using the user’s message if they gave one; otherwise a short imperative summary of what changed (e.g. `Add data-persistence guidance to AGENTS.md`).
3. `git push` to `origin` on the **current branch** (this repo may use `master` or `main`).

Do not commit unrelated working-tree changes unless the user asked to include them.

## Project direction

- Continue the **game journal** from the current state of the codebase.
- Frontend: a **Figma Make** design template exists with limited interactivity; evolve it into a full web UI.
- Goal: a **web application** people can clone and run on their own machine.
- Integrate **IGDB** so game data and the user can interact meaningfully.

## Distribution and access

- People should be able to **download the project** and open it on their computer, or have some **easy way to use it without relying on running everything from a local IDE**.
- That ease-of-access goal may imply **deployment** (e.g. hosted build) so non-developers can use the app; keep that in mind when designing setup and architecture.

## Data and real functionality (current focus)

- **Persist user interaction**: journal entries should be **stored** based on how people use the site—not only in-memory or mock data.
- **Game icons**: use **real IGDB artwork** (as shown on IGDB), not dummy placeholders.
- **Entries**: **real persisted entries**, not dummy placeholder content.
- **Recommendations**: add a **basic ML (or ML-style) model** to recommend games when the user does not have enough personal data to fill sections like **recent games** or similar sparse areas.
- Overall priority: **replace dummy placeholders with real behavior** end to end.

## UI

- The current UI is **acceptable** for now; **polish and tweaks can come later** after core functionality is in place.
