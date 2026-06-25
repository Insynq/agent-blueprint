#!/usr/bin/env node
// context-at-turn — reconstruct which files were ACTUALLY in context at a given
// turn of a session transcript, and flag sources the output CLAIMED but that were
// never in context (the "synthesis trusts a self-report" signal, made testable).
//
// Why this exists: the kai verification investigation's highest-value, cheapest
// idea (findings doc §7) was to capture which files were actually in context at
// the moment of a wrong output — converting "the agent trusted a self-report"
// from an argument into something checkable. The raw data already exists in
// session transcripts (per OC_KB_08); this is the extraction/analysis layer.
//
// Usage:
//   node _dev/tools/context-at-turn.mjs <transcript> [--turn N | --match "substr"] [--json]
//     <transcript>   path to a Claude Code .jsonl transcript
//     --turn N        target the Nth assistant turn (1-based). Default: last.
//     --match "str"   target the first assistant turn whose text contains "str".
//     --json          emit only the JSON object on stdout (no human summary on stderr).
//
// Output: a JSON object on stdout (per OC_KB_06 deterministic-script convention);
// a human-readable summary on stderr tagged [context-at-turn].
//
// SCOPE / HONESTY (what this does and does NOT prove):
//   - VERIFIED format: Claude Code .jsonl (schema confirmed by reading real
//     transcripts: records with type assistant|user, message.content[] of
//     text|thinking|tool_use|tool_result; files enter context via Read/Edit/Write
//     tool_use input.file_path).
//   - The OpenClaw gateway transcript.json schema is NOT implemented — its shape is
//     [VERIFY BEFORE SHIPPING] per OC_KB_08 and could not be inspected from a dev
//     host (no ~/.openclaw present). See readOpenClawTranscript() — implement it
//     against a REAL transcript.json on the runtime host, do not guess the schema.
//   - "filesInContext" is ground truth for Read/Edit/Write targets. "injected"
//     context (CLAUDE.md, memory) is detected heuristically from the first user
//     record and labelled as such — treat it as a hint, not proof.
//   - "claimedButNeverInContext" matches by basename, so it can false-positive on
//     same-named files in different dirs. It is a SIGNAL to investigate, not a verdict.

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const TAG = '[context-at-turn]'
const err = (...a) => process.stderr.write(`${TAG} ${a.join(' ')}\n`)

function parseArgs(argv) {
  const a = { transcript: null, turn: null, match: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t === '--turn') a.turn = parseInt(argv[++i], 10)
    else if (t === '--match') a.match = argv[++i]
    else if (t === '--json') a.json = true
    else if (!t.startsWith('--')) a.transcript = t
  }
  return a
}

// --- transcript readers --------------------------------------------------

function readClaudeCodeJsonl(path) {
  const lines = readFileSync(path, 'utf8').split('\n')
  const records = []
  for (const line of lines) {
    const s = line.trim()
    if (!s) continue
    try { records.push(JSON.parse(s)) } catch { /* skip non-JSON lines */ }
  }
  return records
}

function readOpenClawTranscript() {
  // [VERIFY BEFORE SHIPPING] OpenClaw gateway transcript.json schema is unconfirmed.
  // Inspect a real ~/.openclaw/sessions/<id>/transcript.json on the runtime host,
  // then implement: map its records to the same { role, contentBlocks } shape this
  // tool consumes. Do NOT guess the schema — that is the exact ground-first failure
  // this framework just shipped a fix for.
  throw new Error(
    'OpenClaw transcript.json reader not implemented — schema unverified. ' +
    'Inspect a real transcript.json on the runtime host and implement readOpenClawTranscript(). ' +
    'This tool currently supports Claude Code .jsonl only.'
  )
}

function loadTranscript(path) {
  if (path.endsWith('.jsonl')) return readClaudeCodeJsonl(path)
  if (path.endsWith('.json')) return readOpenClawTranscript(path)
  // default to jsonl attempt
  return readClaudeCodeJsonl(path)
}

// --- helpers -------------------------------------------------------------

function blocksOf(rec) {
  const c = rec?.message?.content
  if (Array.isArray(c)) return c
  if (typeof c === 'string') return [{ type: 'text', text: c }]
  return []
}

function textOf(rec) {
  return blocksOf(rec)
    .filter(b => b.type === 'text')
    .map(b => b.text || '')
    .join('\n')
}

const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'NotebookEdit'])

// extract file-path-like tokens from a chunk of output text
function extractClaimedPaths(text) {
  const found = new Set()
  if (!text) return found
  // markdown links: [label](path) — path with an extension or a slash
  for (const m of text.matchAll(/\]\(([^)\s]+?\.[A-Za-z0-9]+)(?:#[^)]*)?\)/g)) found.add(m[1])
  // backtick-wrapped paths with a slash + extension, optionally :line
  for (const m of text.matchAll(/`([^`\s]*\/[^`\s]*\.[A-Za-z0-9]+)(?::\d+)?`/g)) found.add(m[1])
  // bare path:line or path tokens containing a slash and an extension
  for (const m of text.matchAll(/(?:^|\s)([\w./-]+\/[\w./-]+\.[A-Za-z0-9]+)(?::\d+)?(?=\s|$|[.,)])/g)) found.add(m[1])
  // strip leading ./ and any anchor
  return new Set([...found].map(p => p.replace(/^\.\//, '').split('#')[0]))
}

// --- main ----------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.transcript) {
    err('usage: node _dev/tools/context-at-turn.mjs <transcript.jsonl> [--turn N | --match "substr"] [--json]')
    process.exit(2)
  }

  const records = loadTranscript(args.transcript)
  err(`loaded ${records.length} records from ${args.transcript}`)

  // Index assistant turns in order; build a per-turn view.
  const assistantTurns = []
  records.forEach((rec, recIdx) => {
    if (rec.type === 'assistant') assistantTurns.push({ recIdx, rec, turn: assistantTurns.length + 1 })
  })
  if (assistantTurns.length === 0) {
    err('no assistant turns found in transcript')
    process.exit(1)
  }

  // Resolve the target turn.
  let target
  if (args.match) {
    target = assistantTurns.find(t => textOf(t.rec).includes(args.match))
    if (!target) { err(`no assistant turn contains "${args.match}"`); process.exit(1) }
  } else if (args.turn) {
    target = assistantTurns.find(t => t.turn === args.turn)
    if (!target) { err(`turn ${args.turn} out of range (1..${assistantTurns.length})`); process.exit(1) }
  } else {
    target = assistantTurns[assistantTurns.length - 1]
  }

  // Walk records up to and including the target record; accumulate files-in-context.
  const filesInContext = new Map() // path -> {path, via:Set, firstTurn, lastTurn}
  const noteFile = (path, via, turn) => {
    if (!path) return
    const e = filesInContext.get(path) || { path, via: new Set(), firstTurn: turn, lastTurn: turn }
    e.via.add(via); e.lastTurn = turn
    filesInContext.set(path, e)
  }

  // Heuristic: injected context from the FIRST user record (CLAUDE.md / memory / system-reminders).
  const injected = []
  const firstUser = records.find(r => r.type === 'user')
  if (firstUser) {
    const ft = textOf(firstUser)
    for (const name of ['CLAUDE.md', 'MEMORY.md']) {
      if (ft.includes(name)) { injected.push(name); noteFile(name, 'injected(heuristic)', 0) }
    }
  }

  let curTurn = 0
  for (let i = 0; i <= target.recIdx; i++) {
    const rec = records[i]
    if (rec.type === 'assistant') {
      curTurn = assistantTurns.find(t => t.recIdx === i)?.turn ?? curTurn
      for (const b of blocksOf(rec)) {
        if (b.type === 'tool_use' && FILE_TOOLS.has(b.name)) {
          const fp = b.input?.file_path || b.input?.notebook_path
          noteFile(fp, b.name, curTurn)
        }
      }
    }
  }

  // Claimed sources in the target output text.
  const targetText = textOf(target.rec)
  const claimed = extractClaimedPaths(targetText)

  // Discrepancy: claimed but never in context (basename match, lenient).
  const inContextBasenames = new Set([...filesInContext.keys()].map(p => basename(p)))
  const claimedButNeverInContext = [...claimed].filter(p => !inContextBasenames.has(basename(p)))

  const out = {
    transcript: args.transcript,
    format: 'claude-code-jsonl',
    totalRecords: records.length,
    totalAssistantTurns: assistantTurns.length,
    targetTurn: {
      turn: target.turn,
      uuid: target.rec.uuid ?? null,
      timestamp: target.rec.timestamp ?? null,
      textPreview: targetText.slice(0, 280),
    },
    filesInContext: [...filesInContext.values()]
      .sort((a, b) => a.firstTurn - b.firstTurn)
      .map(e => ({ path: e.path, via: [...e.via], firstTurn: e.firstTurn, lastTurn: e.lastTurn })),
    injectedContextHeuristic: injected,
    claimedSources: [...claimed],
    discrepancies: {
      claimedButNeverInContext, // the §7 signal: cited authoritatively, never actually loaded
    },
    counts: {
      filesInContext: filesInContext.size,
      claimedSources: claimed.size,
      claimedButNeverInContext: claimedButNeverInContext.length,
    },
  }

  process.stdout.write(JSON.stringify(out, null, 2) + '\n')

  if (!args.json) {
    err(`target = assistant turn ${target.turn}/${assistantTurns.length}`)
    err(`files in context at that turn: ${filesInContext.size}`)
    err(`sources the output claims: ${claimed.size}`)
    if (claimedButNeverInContext.length) {
      err(`⚠ CLAIMED BUT NEVER IN CONTEXT (${claimedButNeverInContext.length}) — investigate:`)
      for (const p of claimedButNeverInContext) err(`    - ${p}`)
    } else {
      err(`✓ every claimed source was in context (no self-report-only citations detected)`)
    }
  }
}

main()
