---
name: dash-questions
description: Use when three or more decisions are waiting on the owner, or a phase reaches the point where its open questions go to them all at once. For one or two questions, ask in chat. For reading answers the owner has already given, use /dash.
argument-hint: "[what the questions are about]"
---

# Dash questions

Topic: $ARGUMENTS

Turn the decisions you need from the owner into a question run on the dev dash: one card per question, each choice a row to click, your recommendation marked. Done means the file is saved and passes the edit check, it is committed, the dash shows it, and the owner has the link.

You do this without asking; `.claude/rules/devdash.md` is the authorisation. A numbered list of questions in chat makes the owner hold the list in their head and makes you parse prose back into rulings, and it leaves no record of what was on the table.

## Decide what goes in

List every open question, then cut. A question belongs in the run only if the owner is the one who can answer it: scope, product behaviour, wording users see, money, legal exposure, priorities. For anything else take the sensible default, note it in the spec's decision table, and leave it out. A run padded with questions you could have settled teaches the owner to skim.

If fewer than three remain, ask them in chat and stop here.

## Write the run

Save `devdash/questions/<yyyy-mm-dd>-<slug>.json`. The schema and a full example are in `devdash/README.md` under "Question runs"; `devdash/questions/example-how-you-use-the-dash.json` is a working file to copy the shape from. What makes a run quick to answer:

- **`title` and `intro`** say what prompted the questions and what is already settled, in two sentences.
- **`groups`** when there are more than about six questions, so a long run reads as several short ones.
- **`id`** is short and stable. Reuse the spec's decision ID if it has one, so the answer can be traced.
- **`question`** is one sentence the owner could answer without reading further.
- **`context`** is why it matters and what you already know, in a few short lines. Never put the choices here.
- **`options`**: two to six, each with a one-letter `key`, a short `label`, and a `detail` giving the consequence of picking it. Options must be real alternatives; do not add a weak one to make yours look better. The page adds "Something else" for free text, so do not write that option yourself.
- **`recommend` and `reason`**: mark one option and give the reason in a sentence. This is what makes a run fast, because most answers are "as recommended". Leave both out only when you have no view, such as a question of taste.

Write for a project manager on a phone: plain words, no file paths, no internal identifiers in the text.

The edit hook validates the file as you save it. Fix anything it reports; a broken run is not shown to the owner.

## Hand it over

Commit the file by path. Make sure the dash is up (`node devdash/scripts/start.mjs`), then tell the owner: the link (`http://localhost:<port>/#/questions/<id>`, or their private address if they use one), how many questions, and roughly how long it will take. Say which other work continues meanwhile and which waits on the answers.

Do not wait in the conversation for them to say they are done. A hook tells you when they submit; then `/dash` reads the answers and records them. Never edit the file's questions after the owner has started answering, except to archive it: the answers store what was asked, and a changed question makes an old answer look like agreement to something else.
