# Merging CLAUDE.md

Used by `/adopt`, and by the 0.x migration in `.claude/skills/update-framework/migrating-from-0.x.md`. The goal is the framework's current structure holding the project's content, with nothing the project wrote lost.

## Inputs

- **The project's file**: `CLAUDE.md` as it stands.
- **The template**: the framework's current `CLAUDE.md`. After an install into an existing repository it is `CLAUDE.md.framework`. During a migration it is `CLAUDE.md` in the extracted new version. Read it from disk. Do not reconstruct it from memory or from this document, which names sections only as examples and will fall behind the real file.

If there is no separate template because the project had no `CLAUDE.md` and the installer wrote the template directly, there is nothing to merge: fill the markers in place the way `/kickoff` does, from what you observed.

Copy the project's file to `.framework-backup/CLAUDE.md@pre-adopt` before anything else, unless the caller already has.

## How each kind of section is handled

Walk the template's sections in the template's order and build the merged file from them.

**Project content.** Sections that describe this project: the title, Overview, Stack, Layout, Commands, Current phase, Live invariants, and the preferences paragraph in Working agreements. The project's text wins. Move it under the template's heading, trimmed to what every session needs, and fill gaps from what you observed, marked `(inferred from …)` where it was not stated. Keep the labelled lines of the Commands block exactly as the template has them, since other skills find commands by those labels.

**Framework text.** Sections the framework writes and updates: the autonomy and evidence rules in Working agreements, the Skills table, the reference list, the starting entries under Patterns and Do not. Take the template's text. Then add the project's own entries that belong in the same section: its own skills and commands as rows in the table, its own docs in the reference list, its own patterns and constraints. Where the project's wording of a rule contradicts the template's, show the user both and let them pick; do not blend them.

**Pack sections.** The template carries a `packs:start` and `packs:end` marker pair, and each installed pack has a block between them. Keep those blocks exactly as shipped. If a pack named in `.framework-packs.json` has no block, re-apply the pack (`bin/pack.js add` is safe to repeat) or tell the user it is missing.

**Environment.** Carry over the project's block if it has one. Otherwise leave the marker for `/preflight`.

**Project sections the template has no place for.** Never drop these. For each, propose one of three things and let the user choose:

- fold it into a template section, when it is a few lines that fit there;
- keep it as its own section after the template's sections, when every session needs it;
- move it to a file under `docs/` and leave a one-line pointer in the reference list, when it is long, historical or reference material. `CLAUDE.md` loads into every session, so this is the right home for anything over about twenty lines.

If the project's file shares almost no headings with the template, do not force a section-by-section match. Build the merged file from the template, place the project's content where it clearly belongs, and treat the rest as sections the template has no place for.

## Coming from a 0.x CLAUDE.md

| 0.x section | Goes to |
|---|---|
| Tech Stack | Stack, one line each; the detail to `docs/KB_1_Architecture.md` |
| Build Commands | Commands, mapped onto the template's labelled lines; extra commands kept as extra lines |
| Roles, Core Entities | `docs/KB_1_Architecture.md`, unless short enough to fold into Overview |
| Preferences | the preferences paragraph in Working agreements |
| Patterns | Patterns; the framework's own 0.x bullets are superseded by the template's |
| Reference Documents | the template's list, plus the project's own docs. `docs/MULTI_AGENT_WORKFLOW.md` becomes `docs/WORKFLOW.md` |
| Custom Commands | superseded by the Skills table. Rows for project-authored commands are kept and marked as commands |
| KB Maintenance | the framework's text is dropped (that guidance now lives in the skills); project additions go to Patterns |
| DO NOT | Do not. The 0.x template shipped a list of traps for a hosted agent gateway the framework no longer supports: keep any the project still relies on as its own constraints, and drop the rest only with the user's agreement |
| Unpopulated-file banner | dropped |

Any `[TODO]` the old file still carried maps to the matching marker in the template, which you then fill or leave.

## Before writing

1. **Account for every line.** For each non-blank line of the backup, find where it went: present in the merged file, moved to a named file, or replaced by framework text. Do this mechanically, for example by searching for each line's text, not by reading and judging. List the lines in the last group and anything you could not place.
2. **Show the user** the merged file or its diff against the backup, the list of what moved where, and the list of what was dropped as superseded framework text. Wait for approval. A line they want back goes back.
3. **Write** the merged `CLAUDE.md`, write any files that received moved content, and remove `CLAUDE.md.framework` if there was one.
4. **Check** that the Commands block still has its labelled lines, the pack markers are present, and the file still passes `node .claude/hooks/check-edit.mjs CLAUDE.md`.
