# Gate: <slug>, batch <N>

One section per cycle, appended. Never edit or remove an earlier cycle: the difference between cycles is what a reviewer reads.

## Cycle <1 | fold 1 | fold 2>: YYYY-MM-DD

Worktree: `<path>`  Branch: `<name>`  Head: `<commit>`
Run by: <this session | workflow script>, model <name>

### Build and tests

| Command | Exit code | Counts as printed |
|---|---|---|
| `<build command>` | 0 | |
| `<test command>` | 0 | <passed / failed / skipped, verbatim> |

Failing before the change (from the baseline run): <tests, or none>

### Mutation controls

One row per new or changed test. In fold cycles, repeat every control from the earlier cycles and add rows for new tests.

| Control | What was broken | Tests that went red | Restored |
|---|---|---|---|
| C1 | `<file:line>`: <the change that was reverted or broken> | `<test name>` | yes, tree matches |

Controls from an earlier cycle not re-run: <none | which and why>

### Typecheck and lint against baseline

| Command | Baseline entries | Entries now | New entries |
|---|---|---|---|
| `<typecheck command>` | | | 0 |
| `<lint command>` | | | 0 |

New entries, verbatim: <none | list>

### Files changed

Outside the batch's declared files: <none | list>

### Result

<pass | fail>: <the failing checks, if any>

### Not verified

<What this gate could not check and why. A gate verifies logic; it has not seen a screen or a live service.>
