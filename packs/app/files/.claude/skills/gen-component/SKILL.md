---
name: gen-component
description: Use when a client needs a new interface component and it should match that client's existing components, primitives and tokens instead of being written from a blank file. For a whole feature across data and interface, use /plan.
argument-hint: "<what the component does> [client: web | mobile] [kind: page | modal | form | card | list]"
---

# Write a component

Request: $ARGUMENTS

The arguments are a description, optionally followed by the client it is for and the kind of component. If the project has more than one client and the request does not say which, ask before doing anything, because the two clients do not share components.

Write one component for one client that a maintainer would take for something already in the codebase. Done means the file is where that client keeps such components, it is built from the client's existing primitives, the client's typecheck is clean against its baseline, and you have told the user what it needs from its parent and what you did not verify.

**Stack.** This skill assumes a component-based UI client, such as React on the web or React Native with Expo. It names no library, and reads everything specific from the project. For a UI stack without components in this sense, it does not apply.

## Find out what exists

Read the nested `CLAUDE.md` in the client's directory, and the root one for roles and permissions. If the project keeps a component or pattern catalog (named under Reference documents), read the part for this kind of component.

Then look for the component itself. Search the client for something that already does this or nearly does. If there is one, stop and report it, with what it would take to extend it. A near-duplicate is worse than a missing component, since the next person has to choose between two.

If it is needed, read two or three components of the same kind and take from them, not from habit:

- where the file goes, how it is named, how props are typed and exported;
- which primitives and variants are composed, and where spacing, colour and type sizes come from;
- which hook or query supplies this kind of data, and how the result is mapped;
- how loading, empty and error states look;
- how the client hides or disables what the current role may not do.

Check the shared directory and the client's utilities for formatting, validation and constants before writing any of your own.

## Write it

- Compose the client's primitives. Do not restyle one inline or bring in a second library for something the first already provides.
- Use tokens for every colour, space and size. A literal value is a value that will not change when the theme does.
- Handle loading, empty and error the way the neighbours do. An empty result and a failed fetch are different states and should look different.
- Follow the role model, and remember what it is for: hiding a control is a courtesy to the user. The database's access rules are what stop the action. If the component offers an action that no policy guards, say so in your summary instead of relying on the hidden button.
- Make it reachable without a pointer: real buttons and links, labels on inputs and icon-only controls, focus that goes somewhere sensible when a dialog opens and closes. On mobile, set the accessibility role and label, and keep touch targets at the platform's minimum size.
- Database types come from the one generated types file. Do not restate a row's shape by hand.
- Build what was asked. No extra props for needs nobody has, and no new utility file for one caller.

A component that spends money, contacts a real person or cannot be undone needs a confirmation step in the client's existing pattern, and belongs in `docs/prod-action-safety-map.md` if the project keeps one. Say so in the summary.

Add a test where the client's components have tests, in their style, and see it fail once before trusting it.

## The other client

A component is written for one client. Do not copy it into the other: the primitives, navigation and data layer differ, and a copied file starts drifting the day it lands. If the same interface is wanted on the other client, that is its own piece of work. When this component is part of a spec, the spec's `## Clients` section already says whether the other client is built, owed or not applicable. When it is a standalone request and the other client plainly needs the same thing, tell the user and offer to add a row to `docs/PARITY_LEDGER.md`.

## Check and report

Run the client's typecheck and lint from its own directory, with the commands in `CLAUDE.md`, and compare against the baseline.

Tell the user:

- the file path and how to import it;
- the props the parent must supply, and any hook or utility it depends on;
- what you reused, so they can see it was not reinvented;
- what was checked and what was not. A typecheck says nothing about how it looks. The component is not eyeballed until a person has seen it in the running client, at a narrow width, in each state and in dark mode if the client has one. Name that as a `visual` lane smoke.

If the project keeps a component catalog, add the entry there in the catalog's existing format: purpose, when to use it, when not to.
