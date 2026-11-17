// Checks the files the agent writes for the dev dash: question runs, sittings
// and daily log entries. A file that breaks its schema is not shown to the
// owner at all, so it is caught here, at the edit.

import { validateRun, validateSitting, validateLogEntry } from '../../../devdash/lib/validate.mjs';

export const name = 'devdash-definitions';

const RUN = /^devdash\/questions\/([^/]+)\.json$/;
const SITTING = /^devdash\/sittings\/([^/]+)\/sitting\.json$/;
const LOG = /^devdash\/log\/([^/]+)\.md$/;

export function match(rel) {
  return RUN.test(rel) || SITTING.test(rel) || (LOG.test(rel) && !rel.endsWith('/README.md'));
}

export function check(rel, content) {
  const log = LOG.exec(rel);
  if (log) return validateLogEntry(log[1], content);
  const run = RUN.exec(rel);
  const id = (run || SITTING.exec(rel))[1];
  let data;
  try { data = JSON.parse(content); } catch (err) { return ['not valid JSON: ' + err.message]; }
  return run ? validateRun(data, id) : validateSitting(data, id);
}
