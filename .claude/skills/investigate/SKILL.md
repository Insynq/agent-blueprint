---
name: investigate
description: Use when you need to know how something in the codebase works, where a behaviour comes from, or everything that uses a function, type or piece of state, before deciding what to change. For a failure that needs fixing, use /debug. For choosing between approaches, use /brainstorm.
argument-hint: "<question or area> [file or symbol to start from]"
---

# Investigate

Question: $ARGUMENTS

Answer the question by tracing the code, and show the trace. Done means every statement in your answer points at a `file:line` you opened, the reader can tell what you established from what you assumed, and anything you report as absent comes with the searches that failed to find it.

This skill reads. It does not change code, and it does not choose a design.

## Where to start

If the question starts from something concrete (an error message, a failing test, a log line, a wrong value, something the user quoted), quote that artifact first and take your entry point from what it shows. The description of a problem has usually been interpreted already, and an entry point picked from the interpretation sends the whole trace down the wrong path. If you cannot get the artifact, say so, and mark conclusions that depend on it as resting on the description.

A question like "how does X work" or "where is Y used" has no artifact. Start from the symbol or file named in the arguments, or find the entry point by searching.

Check `docs/LESSONS.md` for the area. A known gotcha there is cheaper than rediscovering it.

## Tracing

- **Follow the path end to end**, from where the data or event enters to where its effect lands. At each hop note what is passed, what transforms it, and what condition decides the branch.
- **Confirm which code runs.** The code you are reading may not be the code that executes. Check that it is imported, registered, routed to or scheduled, and that no second implementation shadows it. Code that looks right and is never reached explains a large share of "the fix did nothing".
- **Find every use, not the first.** For a function, every caller. For a type or contract, every producer and consumer. For shared state (a table, a store, a file, a cache), everything that reads it and everything that writes it.
- **Look for references a symbol search misses**: names built from strings, entries in configuration, re-exports under another name, generated code, reflection, and callers in other packages of the repository.
- **Note what already exists.** If the question leads toward new code, report the utilities and patterns in the codebase that already do the job or could be extended.

For a wide sweep (usages across many directories), dispatch the `explorer` agent. Give it the exact symbol or pattern, the directories, and ask for a list of `file:line` with the quoted line. What comes back is a claim: open the lines your conclusion rests on before you repeat them.

## "Not found" is a statement about the search

An empty search result is the least trustworthy thing a tool returns. Before you report that something does not exist or is never called:

1. Run a control: use the same search method on something you know is there. If the control also comes back empty, the search is broken (wrong directory, an ignore rule, a wrong file type), and your result means nothing.
2. Search a second way: another spelling or casing, the string form of the name, the file or route that would have to refer to it, or the other end of the relationship (the callee's imports instead of the caller's calls).
3. Report the absence together with what you searched and where. "No callers of `foo` in `src/` or `scripts/`, by symbol search and by string search" can be checked. "`foo` is unused" cannot.

## How sure you are

Reading code tells you what the code says. In the terms of the `CLAUDE.md` evidence glossary, a path you read end to end is trace-verified, and it is verified only if you ran it or probed it. Use the words that way. Where a conclusion depends on runtime state you did not observe (a configuration value, a feature flag, what is in the data store), say so and name the check that would settle it.

## Report

```markdown
# Investigation: <question>

## Answer
<Two to four sentences. The direct answer, and how sure: verified, trace-verified or inferred.>

## Starting artifact
<Verbatim quote, or "none: exploratory", or "unavailable: conclusions rest on the description".>

## Path
- <file:line>: <what happens here, and the condition if there is one>

## Uses
| Where | file:line | Role (caller, reader, writer, consumer) |

## What runs
<The active implementation, how you confirmed it is wired in, and any dead or shadowed code.>

## Already exists
<Reusable code that bears on the question, with file:line. Omit if none.>

## Searched and not found
<What was absent, the searches run, the control.>

## Not established
<What this investigation did not settle, and the check that would settle it.>
```

Leave out a section that does not apply, except Answer and Not established.

If the investigation finds nothing (no such behaviour, no usages, or the reported problem is not present in the code), say that plainly as the answer and list exactly what you inspected: files, directories, symbols and search patterns. A thin answer reads as a run that failed and gets run again.

From here, `/debug` takes a confirmed fault and `/plan` takes findings that call for a change.
