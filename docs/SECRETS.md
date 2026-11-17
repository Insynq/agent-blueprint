# Secrets

Where secrets live and how they are handled. A secret is anything that grants access: API keys, tokens, passwords, database URLs with credentials, signing keys.

## Where they live

- **Never in the repository.** Not in code, docs, specs, test fixtures, commit messages or pull request descriptions. A hook rejects edits that contain a recognisable key.
- **Names in `.env.example`, values elsewhere.** `.env.example` lists every variable the project needs, with what it is for and where to get it. It is the only committed file about secrets.
- **Values in a secrets manager** where the project has one, loaded into the process at run time. A local `.env` file, ignored by git, is the fallback for one developer on one machine.
- **One set per environment.** Local, demo and production each have their own values. A key that works in two environments means a mistake in one reaches the other.

`CLAUDE.md` records which secrets manager the project uses and how a process gets its values.

## Handling

- **Never print a secret to check it**, and never paste one into chat. To confirm a variable is set, test its length or compare a hash. `${VAR:+set}${VAR:-missing}` prints the value when it is set.
- **Pipe between tools.** Move a secret from the manager to where it is needed without it passing through the conversation or a file in the repository.
- **A new worktree has no `.env`.** Copy the minimum it needs, and remove it with the worktree.
- **Scope to the job.** A script that reads does not get a key that writes. A machine someone else operates gets its own narrowly scoped credentials, not a copy of the owner's.
- **A rotating token has exactly one holder.** A second copy anywhere breaks the chain the next time it rotates.

## When one leaks

A secret that has appeared in chat, a log, a commit or a screenshot is compromised, whether or not anyone saw it.

1. Rotate it at the provider now. Removing it from history does not un-leak it.
2. Update the value in the secrets manager and anything that caches it.
3. Check the provider's access log for use you do not recognise.
4. Add a line to `docs/LESSONS.md` on how it got out.

## Adding one

Add the name to `.env.example` with its comment, add the value to the secrets manager for each environment that needs it, and say in the pull request that a new secret is required, so that whoever releases knows to set it first.
