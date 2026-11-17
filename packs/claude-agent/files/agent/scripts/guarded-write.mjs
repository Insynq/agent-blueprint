#!/usr/bin/env node
// guarded-write.mjs: the one write path for the agent's internal stores.
//
// It replaces "ask a person before every write" with protections that hold
// whether or not anyone is watching:
//
//   - update and delete need a row filter; an unfiltered write is refused;
//   - the matched rows are read first, and a write above the row cap is refused;
//   - the matched rows (the pre-image) are appended to a log file BEFORE
//     anything changes, so a bad write can be put back from the log;
//   - every call is a dry run unless it carries --confirm AND the environment
//     carries the authorisation flag (AGENT_WRITE_AUTHORIZED=true by default);
//   - after a real write the rows are read back and compared.
//
// A dry run still reads the store and runs every guard. Only the write is
// skipped, so what a dry run prints is what a confirmed run would touch.
//
// This is for stores the project owns and can restore. Outward or irreversible
// actions (sending, paying, posting to someone else's system) do not go through
// here: see docs/AGENT_PATTERNS.md.
//
// CLI:
//   guarded-write.mjs insert <target> --rows '<json array>' | --rows @file.json
//   guarded-write.mjs update <target> --where key=value [--where ...] --set '<json object>' | --set @file.json
//   guarded-write.mjs delete <target> --where key=value [--where ...]
//
//   --confirm          perform the write (also needs the environment flag)
//   --max-rows N       raise the row cap for this call (default 25)
//   --store <dir>      json-file adapter: directory of <target>.json files
//                      (default: $GUARDED_WRITE_STORE or agent/data)
//   --adapter <path>   module exporting createAdapter(options) for another store
//   --log <file>       pre-image log (default: $GUARDED_WRITE_LOG or
//                      agent/logs/guarded-writes.jsonl)
//
// Exit codes:
//   0  dry run completed, or write made and verified
//   1  unexpected error (store unreachable, bad adapter)
//   2  refused by a guard (no filter, over the cap, nothing matched, bad input)
//   3  --confirm given but the environment flag is not set; nothing written
//   4  write made but the read-back did not match; treat the store as suspect
//
// Adapter interface (all methods may be async):
//   key                               name of the unique row key (default "id")
//   find(target, filter)              -> array of full rows matching every filter pair
//   insert(target, rows)              -> array of rows as stored
//   update(target, filter, patch)     -> array of rows after the change
//   remove(target, filter)            -> array of rows removed
// A filter is a plain object of column -> value, all of which must match.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_ENV_FLAG = 'AGENT_WRITE_AUTHORIZED';
export const DEFAULT_MAX_ROWS = 25;

export const EXIT = { OK: 0, ERROR: 1, REFUSED: 2, NOT_AUTHORISED: 3, UNVERIFIED: 4 };

export class Refusal extends Error {
  constructor(message, code = EXIT.REFUSED) { super(message); this.name = 'Refusal'; this.exitCode = code; }
}

// ---- json-file adapter ------------------------------------------------------
// One JSON array per target, at <dir>/<target>.json. Small enough to read in
// full, which is the point: the pack runs and can be tested as shipped. Values
// are compared as strings, so --where id=3 matches both 3 and "3".

export function jsonFileAdapter({ dir, key = 'id' }) {
  const file = (target) => {
    if (!/^[A-Za-z0-9_-]+$/.test(target)) throw new Refusal('target "' + target + '" must be a plain name (letters, digits, - and _).');
    return path.join(dir, target + '.json');
  };
  const load = (target) => {
    const fp = file(target);
    if (!fs.existsSync(fp)) throw new Refusal('no such target: ' + fp + ' does not exist.');
    const rows = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!Array.isArray(rows)) throw new Error(fp + ' is not a JSON array.');
    return rows;
  };
  const save = (target, rows) => {
    // Write to a temp file and rename, so a crash never leaves half a file.
    const fp = file(target);
    const tmp = fp + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(rows, null, 2) + '\n');
    fs.renameSync(tmp, fp);
  };
  const matches = (row, filter) => Object.entries(filter).every(([k, v]) => k in row && String(row[k]) === String(v));
  return {
    name: 'json-file',
    key,
    find(target, filter) { return load(target).filter((r) => matches(r, filter)); },
    insert(target, rows) {
      const all = load(target);
      for (const r of rows) {
        if (key in r && all.some((x) => String(x[key]) === String(r[key]))) {
          throw new Refusal('insert would duplicate ' + key + '=' + r[key] + ' in "' + target + '".');
        }
        all.push(r);
      }
      save(target, all);
      return rows;
    },
    update(target, filter, patch) {
      const all = load(target);
      const changed = [];
      for (const r of all) if (matches(r, filter)) { Object.assign(r, patch); changed.push(r); }
      save(target, all);
      return changed;
    },
    remove(target, filter) {
      const all = load(target);
      save(target, all.filter((r) => !matches(r, filter)));
      return all.filter((r) => matches(r, filter));
    },
  };
}

// ---- the guard --------------------------------------------------------------

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function appendLog(logFile, entry) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
}

// Read the rows back and say whether the store now holds what was asked for.
// Returns { verified: true | false | 'skipped', detail }.
async function readBack(adapter, op, target, filter, { preImage, patch, written }) {
  const key = adapter.key || 'id';
  if (op === 'delete') {
    const left = await adapter.find(target, filter);
    return left.length === 0
      ? { verified: true, detail: 'filter now matches 0 rows' }
      : { verified: false, detail: left.length + ' row(s) still match the filter' };
  }
  const expected = op === 'update' ? preImage : written;
  if (!expected.every((r) => isPlainObject(r) && key in r)) {
    return { verified: 'skipped', detail: 'rows carry no "' + key + '" key to read back by' };
  }
  for (const row of expected) {
    const now = await adapter.find(target, { [key]: row[key] });
    if (now.length !== 1) return { verified: false, detail: key + '=' + row[key] + ' reads back as ' + now.length + ' rows' };
    const want = op === 'update' ? patch : row;
    for (const [k, v] of Object.entries(want)) {
      if (!same(now[0][k], v)) return { verified: false, detail: key + '=' + row[key] + ' field "' + k + '" does not hold the written value' };
    }
  }
  return { verified: true, detail: expected.length + ' row(s) read back by ' + key };
}

// Run one guarded write. Throws Refusal when a guard stops it.
// Returns a result object; result.exitCode says how it ended.
export async function guardedWrite({
  adapter, op, target, filter = {}, patch, rows,
  confirm = false, maxRows = DEFAULT_MAX_ROWS,
  envFlag = DEFAULT_ENV_FLAG, env = process.env,
  logFile, now = () => new Date().toISOString(),
}) {
  if (!adapter) throw new Refusal('no adapter.');
  if (!['insert', 'update', 'delete'].includes(op)) throw new Refusal('operation must be insert, update or delete (got "' + op + '").');
  if (!target) throw new Refusal('no target named.');
  if (!logFile) throw new Refusal('no log file configured; a write with no pre-image log cannot be undone.');
  if (!Number.isInteger(maxRows) || maxRows < 1) throw new Refusal('row cap must be a positive whole number.');

  let preImage = [];
  if (op === 'insert') {
    if (!Array.isArray(rows) || rows.length === 0 || !rows.every(isPlainObject)) {
      throw new Refusal('insert needs a non-empty array of row objects.');
    }
    if (rows.length > maxRows) {
      throw new Refusal('insert of ' + rows.length + ' rows is over the cap of ' + maxRows + '. Split it, or pass --max-rows ' + rows.length + ' if this size is intended.');
    }
  } else {
    if (!isPlainObject(filter) || Object.keys(filter).length === 0) {
      throw new Refusal(op + ' on "' + target + '" has no row filter. An unfiltered ' + op + ' touches every row; name the rows with --where key=value.');
    }
    if (op === 'update' && (!isPlainObject(patch) || Object.keys(patch).length === 0)) {
      throw new Refusal('update needs a non-empty object of fields to set.');
    }
    // Read real state even in a dry run: a dry run that skips the read
    // reports on a store that does not exist.
    preImage = await adapter.find(target, filter);
    if (preImage.length === 0) {
      throw new Refusal(op + ' filter matches 0 rows in "' + target + '". Nothing to change; check the filter. Filter was ' + JSON.stringify(filter) + '.');
    }
    if (preImage.length > maxRows) {
      throw new Refusal(op + ' filter matches ' + preImage.length + ' rows in "' + target + '", over the cap of ' + maxRows + '. Narrow the filter, or pass --max-rows ' + preImage.length + ' if this size is intended.');
    }
  }

  const affected = op === 'insert' ? rows.length : preImage.length;
  const base = { op, target, filter: op === 'insert' ? undefined : filter, rows_affected: affected };

  if (!confirm) {
    return {
      ...base, ok: true, dry_run: true, exitCode: EXIT.OK,
      would_change: op === 'insert' ? rows : preImage,
      patch: op === 'update' ? patch : undefined,
      hint: 'dry run: nothing written. To write, add --confirm with ' + envFlag + '=true in the environment.',
    };
  }
  if (env[envFlag] !== 'true') {
    throw new Refusal(
      '--confirm given but ' + envFlag + ' is not "true" in the environment. Nothing written. ' +
      'The flag is set by the person authorising this run, in the shell or scheduler that starts it.',
      EXIT.NOT_AUTHORISED
    );
  }

  // Pre-image first. If the log cannot be written the write does not happen.
  const ts = now();
  appendLog(logFile, { ts, phase: 'intent', adapter: adapter.name, ...base, patch, rows, pre_image: preImage });

  let written;
  try {
    if (op === 'insert') written = await adapter.insert(target, rows);
    else if (op === 'update') written = await adapter.update(target, filter, patch);
    else written = await adapter.remove(target, filter);
  } catch (err) {
    appendLog(logFile, { ts: now(), phase: 'result', intent_ts: ts, ok: false, error: err.message });
    throw err;
  }

  const check = await readBack(adapter, op, target, filter, { preImage, patch, written: written || rows });
  appendLog(logFile, { ts: now(), phase: 'result', intent_ts: ts, ok: check.verified !== false, verified: check.verified, detail: check.detail });

  return {
    ...base, ok: check.verified !== false, dry_run: false,
    verified: check.verified, verify_detail: check.detail,
    pre_image_logged: logFile,
    exitCode: check.verified === false ? EXIT.UNVERIFIED : EXIT.OK,
  };
}

// ---- CLI --------------------------------------------------------------------

function readJsonArg(value, what) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(value.startsWith('@') ? fs.readFileSync(value.slice(1), 'utf8') : value);
  } catch (err) {
    throw new Refusal(what + ' is not valid JSON: ' + err.message);
  }
}

function parseArgs(argv) {
  const o = { positional: [], where: {}, confirm: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Refusal(a + ' needs a value.');
      return argv[++i];
    };
    if (a === '--confirm') o.confirm = true;
    else if (a === '--where') {
      const pair = next();
      const at = pair.indexOf('=');
      if (at < 1) throw new Refusal('--where takes key=value (got "' + pair + '").');
      if (pair.slice(at + 1) === '') throw new Refusal('--where ' + pair.slice(0, at) + '= has an empty value. An empty value usually means a variable did not expand.');
      o.where[pair.slice(0, at)] = pair.slice(at + 1);
    } else if (a === '--set') o.set = next();
    else if (a === '--rows') o.rows = next();
    else if (a === '--max-rows') o.maxRows = Number(next());
    else if (a === '--store') o.store = next();
    else if (a === '--adapter') o.adapter = next();
    else if (a === '--log') o.log = next();
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('--')) throw new Refusal('unknown flag ' + a + '.');
    else o.positional.push(a);
  }
  return o;
}

async function main(argv) {
  const o = parseArgs(argv);
  if (o.help || o.positional.length === 0) {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    const from = src.findIndex((l) => l.startsWith('// CLI:'));
    const to = src.findIndex((l) => l.startsWith('// Adapter interface'));
    console.log(src.slice(from, to).map((l) => l.replace(/^\/\/ ?/, '')).join('\n').trimEnd());
    return EXIT.OK;
  }
  const [op, target] = o.positional;
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const logFile = path.resolve(root, o.log || process.env.GUARDED_WRITE_LOG || 'agent/logs/guarded-writes.jsonl');

  let adapter;
  if (o.adapter) {
    const mod = await import(pathToFileURL(path.resolve(root, o.adapter)).href);
    if (typeof mod.createAdapter !== 'function') throw new Error(o.adapter + ' does not export createAdapter(options).');
    adapter = await mod.createAdapter({ root, store: o.store });
  } else {
    adapter = jsonFileAdapter({ dir: path.resolve(root, o.store || process.env.GUARDED_WRITE_STORE || 'agent/data') });
  }

  const result = await guardedWrite({
    adapter, op, target, filter: o.where,
    patch: readJsonArg(o.set, '--set'),
    rows: readJsonArg(o.rows, '--rows'),
    confirm: o.confirm,
    maxRows: o.maxRows === undefined ? DEFAULT_MAX_ROWS : o.maxRows,
    logFile,
  });
  const { exitCode, ...printable } = result;
  console.log(JSON.stringify(printable, null, 2));
  if (exitCode === EXIT.UNVERIFIED) console.error('[guarded-write] WRITTEN BUT NOT VERIFIED: ' + result.verify_detail + '. Pre-image is in ' + logFile + '.');
  return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      if (err instanceof Refusal) {
        console.error('[guarded-write] REFUSED: ' + err.message);
        process.exit(err.exitCode);
      }
      console.error('[guarded-write] ERROR: ' + (err && err.message ? err.message : String(err)));
      process.exit(EXIT.ERROR);
    }
  );
}
