# Audit checklist

Prompts for the judges dispatched by `/audit-code`. They are places to look, not a form to fill in: skip what cannot apply to the target, and report what you find that is not listed. Stack-specific checks come from the project's `CLAUDE.md` and from any pack's audit skill.

## Lens A: defects and security

### Defects

- Does the code do what its caller needs on the unhappy paths: empty input, a missing record, a partial failure, a retry?
- At each system boundary (network, data store, file system, another process), is failure handled or deliberately propagated? A failure reported as success is worse than a crash.
- Is any shared counter, flag or status written by more than one code path? List every writer and check each is atomic.
- Do the types and enumerated values match the project's shared definitions, or has a shared concept been redefined inline?
- Is a limit, fee or threshold hardcoded here while a configurable copy exists elsewhere?
- Does a changed query or selection have a matching change in the mapping that consumes it, at every site that shares the pattern?

### Security

- **Access bypass.** For anything that accepts an identifier or a status from a client: can it be called directly with fabricated values to skip validation or payment? Is the check enforced on the server side, or only in the interface?
- **Scope.** Can a lower-privileged user trigger an action reserved for a higher role, or reach another user's record by changing an id?
- **Inbound events.** Is the origin of a webhook or message verified? What happens if the same event arrives twice?
- **Money.** Are amounts taken from the system of record and never from the client? Does the paying identity belong to the authenticated user?
- **Exposure.** Do new fields (tokens, keys, internal identifiers, personal data) reach a client through an existing broad query? Does any log line or error response carry a secret, personal data, or internal structure such as table names and stack traces?
- **Injection.** Is user-supplied content rendered, interpolated into a query, a shell command, a URL or a template, or passed to a model as instructions, without escaping or validation?
- **State changes.** Does every state-changing entry point check who is calling? Does any read-style request change state? Is cross-origin access restricted by configuration and not a wildcard?
- **Abuse.** Are sign-in, sign-up, password reset, outbound messaging and payment creation rate limited?
- **Secrets.** Is any secret referenced from code that ships to a client, committed in a file, or printed?
- **Irreversible writes.** Does a migration or bulk write destroy data, and is there a way back?

## Lens B: reuse and simplicity

### Reuse

- Search the directories named under Layout in `CLAUDE.md` for something that already does this. Open the candidate and read it: can it be used as is, extended, or extracted into something shared?
- Does this fetch or compute data that another part of the code already holds?
- Are there now two near-identical things where one with a parameter would do?

### Pattern alignment

- Read two or three existing files of the same kind. Does the new code fetch data, identify the current user, check permissions and handle errors the way they do?
- Does it follow every entry under Patterns in `CLAUDE.md`, and break none under Do not?

### Simpler alternatives

- An abstraction with a single use, or a helper for a one-off operation.
- Design for a requirement nobody has stated.
- Error handling for a case that cannot occur given the callers.
- A flag or a configuration option where a direct change would do.
- A change much larger than the request called for. That is a sign the approach is fighting the codebase; say what the smaller change would have been.

For each simpler alternative, describe it concretely enough to be built. "This could be simpler" is not a finding.
