#!/usr/bin/env node
// Start, check or stop the dash server in the background.
//
//   node devdash/scripts/start.mjs            status, and start it if it is down
//   node devdash/scripts/start.mjs status     status only
//   node devdash/scripts/start.mjs stop
//   node devdash/scripts/start.mjs link       the one-time sign-in link for another device
//
// The server always runs from the main checkout, so starting it from a
// worktree gives the same dash.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT, DASH_DIR, DATA, config, readJson } from '../lib/root.mjs';

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith('--')) || 'start';
const quiet = args.includes('--quiet');
const say = (m) => { if (!quiet) console.log(m); };
const pidFile = path.join(DATA, 'server.json');

function alive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }

function ping(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/meta', timeout: 1500 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function status() {
  const info = readJson(pidFile, null);
  if (!info || !alive(info.pid)) return null;
  const meta = await ping(info.port);
  return meta ? { ...info, meta } : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let st = await status();

if (cmd === 'stop') {
  if (!st) { say('The dash is not running.'); process.exit(0); }
  process.kill(st.pid, 'SIGTERM');
  say('Stopped the dash (pid ' + st.pid + ').');
  process.exit(0);
}

if (cmd === 'link') {
  const token = (() => { try { return fs.readFileSync(path.join(DATA, 'token'), 'utf8').trim(); } catch { return ''; } })();
  if (!token) { console.error('No token yet. Start the dash once first.'); process.exit(1); }
  console.log('Open this once on the other device, with your private host name in place of <host>:');
  console.log('  https://<host>/login#' + token);
  console.log('It signs that device in for a year. Treat the link like a password.');
  process.exit(0);
}

if (!st && cmd === 'start') {
  const own = path.join(ROOT, 'devdash', 'server.mjs');
  const server = fs.existsSync(own) ? own : path.join(DASH_DIR, 'server.mjs');
  fs.mkdirSync(DATA, { recursive: true });
  const log = fs.openSync(path.join(DATA, 'server.log'), 'a');
  const child = spawn(process.execPath, [server], { cwd: ROOT, detached: true, stdio: ['ignore', log, log] });
  child.unref();
  for (let i = 0; i < 20 && !st; i++) { await sleep(150); st = await status(); }
  if (!st) {
    const other = await ping(config().port);
    console.error(other ? 'Port ' + config().port + ' is serving another project\'s dash (' + other.root + '). Set a different "port" in devdash/config.json.' : 'The dash did not start. See ' + path.join(DATA, 'server.log'));
    process.exit(1);
  }
  say('Started the dash.');
}

if (!st) { say('The dash is not running. Start it with: node devdash/scripts/start.mjs'); process.exit(cmd === 'status' ? 1 : 0); }

say('Dash: http://localhost:' + st.port + '/   (pid ' + st.pid + ', project ' + st.meta.project + ')');
say('Reading ' + st.meta.reading + (st.meta.fetched.at ? ', fetched ' + st.meta.fetched.at.slice(0, 16).replace('T', ' ') + ' UTC' + (st.meta.fetched.ok === false ? ' (fetch failed)' : '') : '') + '.');
say('Waiting on the owner: ' + st.meta.nav.questions + ' question run(s), ' + st.meta.nav.sittings + ' sitting(s). Smoke rows not passed: ' + st.meta.nav.smokes + '.');
