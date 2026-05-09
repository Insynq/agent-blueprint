#!/usr/bin/env node
//
// OpenClaw GitOps webhook receiver.
//
// HMAC-verified entry point for deploy. Run under launchd as a long-lived process.
// On a verified webhook, invokes deploy.sh.
//
// Adopter MUST fill in TODO markers before first deploy.
//
// Bind to 127.0.0.1; expose to GitHub via a tunnel (Cloudflare, ngrok, Tailscale).
// Never expose 0.0.0.0 directly — the HMAC is authentication, but defense in depth
// keeps the network surface area minimized.

'use strict';

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');

// TODO: port to listen on
const PORT = 9100;

// HMAC secret. Source: launchd plist EnvironmentVariables.WEBHOOK_SECRET.
// Configure the same secret in the GitHub webhook settings.
const SECRET = process.env.WEBHOOK_SECRET;
if (!SECRET) {
  console.error('[webhook] WEBHOOK_SECRET not set in env; refusing to start');
  process.exit(1);
}

// TODO: path to deploy.sh on the runtime host
const DEPLOY_SCRIPT = path.join(process.env.HOME || '', 'path/to/deploy.sh');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const sig = req.headers['x-hub-signature-256'];
    const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');

    // Constant-time compare. NEVER use === for HMAC verification.
    let valid = false;
    try {
      valid = crypto.timingSafeEqual(Buffer.from(sig || ''), Buffer.from(expected));
    } catch {
      valid = false;
    }

    if (!valid) {
      console.error('[webhook] invalid signature');
      res.writeHead(401).end();
      return;
    }

    console.log('[webhook] verified; running deploy');
    execFile(DEPLOY_SCRIPT, [], (err, stdout, stderr) => {
      if (err) {
        console.error(`[webhook] deploy failed: ${err.message}`);
      } else {
        console.log('[webhook] deploy complete');
      }
    });

    // Respond immediately; the deploy continues asynchronously.
    res.writeHead(202).end();
  });
});

// Bind to localhost only.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[webhook] listening on 127.0.0.1:${PORT}`);
});
