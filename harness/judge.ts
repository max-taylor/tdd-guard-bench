// LLM-judge orchestrator.
// For each task: build every A/B/C pair across n=3 runs, randomly assign which
// candidate gets the "A" slot (position-bias control), call the judge model,
// run each pair 3× for majority verdict, aggregate to findings/judge-<task>.md.
//
// Usage:
//   OPENAI_API_KEY=... npx tsx harness/judge.ts                 # all tasks
//   OPENAI_API_KEY=... npx tsx harness/judge.ts rate-limiter    # one task
//   --dry                                                       # count pairs without calling
//
// Round-2 src only — round-1 state was overwritten by the followup.

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import * as fs from 'node:fs'
import * as path from 'node:path'

// ---- config
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const RUBRIC_PATH = path.join(ROOT, 'rubric', 'judge-rubric.md')
const TASKS = ['rate-limiter', 'csv-parser', 'retry'] as const
const CONDITIONS = ['A', 'B', 'C'] as const
type Condition = (typeof CONDITIONS)[number]
type Task = (typeof TASKS)[number]

const CONDITION_DIRS: Record<Condition, string> = {
  A: 'A-no-instruction',
  B: 'B-claude-md-tdd',
  C: 'C-tdd-guard',
}

const MODEL = 'gpt-5'
const RUNS = 3

const args = process.argv.slice(2)
const ONLY_TASK = args.find((a) => !a.startsWith('--')) as Task | undefined
const DRY = args.includes('--dry')

// ---- output schema
const Verdict = z.enum(['A', 'B', 'tie'])
const JudgeOutput = z.object({
  test_quality: Verdict,
  test_quality_reason: z.string(),
  design_quality: Verdict,
  design_quality_reason: z.string(),
  spec_adherence: Verdict,
  spec_adherence_reason: z.string(),
  restraint: Verdict,
  restraint_reason: z.string(),
})
type JudgeOutput = z.infer<typeof JudgeOutput>
const DIMENSIONS = ['test_quality', 'design_quality', 'spec_adherence', 'restraint'] as const
type Dimension = (typeof DIMENSIONS)[number]

// ---- helpers
function readBundle(dir: string): string {
  const parts: string[] = []
  for (const sub of ['src', 'tests']) {
    const subdir = path.join(dir, sub)
    if (!fs.existsSync(subdir)) continue
    const files = fs.readdirSync(subdir).filter((f) => f.endsWith('.ts')).sort()
    for (const f of files) {
      const content = fs.readFileSync(path.join(subdir, f), 'utf8')
      parts.push(`=== ${sub}/${f} ===\n${content}`)
    }
  }
  return parts.join('\n\n')
}

function listRuns(task: Task, cond: Condition): string[] {
  const runsDir = path.join(ROOT, 'runs')
  return fs
    .readdirSync(runsDir)
    .filter((d) => d.startsWith(`${task}-`))
    .map((d) => path.join(runsDir, d, CONDITION_DIRS[cond]))
    .filter((d) => fs.existsSync(path.join(d, 'src')))
    .sort()
}

function loadSpec(task: Task): string {
  return fs.readFileSync(path.join(ROOT, 'specs', `${task}.md`), 'utf8')
}

function loadFollowup(task: Task): string | undefined {
  const followupMap: Record<Task, string> = {
    'rate-limiter': 'rate-limiter-reset.md',
    'csv-parser': 'csv-crlf.md',
    'retry': 'retry-retry-after.md',
  }
  const p = path.join(ROOT, 'followups', followupMap[task])
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined
}

const RUBRIC = fs.readFileSync(RUBRIC_PATH, 'utf8')

function buildPrompt(task: Task, candAContent: string, candBContent: string): string {
  const spec = loadSpec(task)
  const followup = loadFollowup(task)
  return `${RUBRIC}

## Spec (round 1)
${spec}

${followup ? `## Spec extension (round 2)\n${followup}\n` : ''}

## Candidate A
${candAContent}

## Candidate B
${candBContent}
`
}

// Deterministic pair generator: for each condition pair, every A run × every B run.
function generatePairs(task: Task): Array<{
  pairId: string
  task: Task
  condX: Condition
  condY: Condition
  pathX: string
  pathY: string
}> {
  const runsByCondition: Record<Condition, string[]> = {
    A: listRuns(task, 'A'),
    B: listRuns(task, 'B'),
    C: listRuns(task, 'C'),
  }
  const pairs: ReturnType<typeof generatePairs> = []
  const conditionPairs: Array<[Condition, Condition]> = [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'C'],
  ]
  for (const [cx, cy] of conditionPairs) {
    for (const px of runsByCondition[cx]) {
      for (const py of runsByCondition[cy]) {
        const xLabel = path.basename(path.dirname(px))
        const yLabel = path.basename(path.dirname(py))
        pairs.push({
          pairId: `${task}::${cx}vs${cy}::${xLabel}_vs_${yLabel}`,
          task,
          condX: cx,
          condY: cy,
          pathX: px,
          pathY: py,
        })
      }
    }
  }
  return pairs
}

async function callJudge(prompt: string): Promise<JudgeOutput | null> {
  try {
    const { object } = await generateObject({
      model: openai(MODEL),
      schema: JudgeOutput,
      prompt,
    })
    return object
  } catch (e: any) {
    console.error('  judge error:', e?.message ?? e)
    return null
  }
}

// ---- judging one pair (3 calls, majority verdict per dimension)
async function judgePair(pair: ReturnType<typeof generatePairs>[number]): Promise<{
  pairId: string
  condX: Condition
  condY: Condition
  // Resolved back to {condX, condY, tie} terms after position-flip decoding.
  results: Record<Dimension, { verdict: 'X' | 'Y' | 'tie'; reasons: string[] }>
  raw: Array<{ slotAisX: boolean; out: JudgeOutput | null }>
}> {
  const bundleX = readBundle(pair.pathX)
  const bundleY = readBundle(pair.pathY)
  const raw: Array<{ slotAisX: boolean; out: JudgeOutput | null }> = []
  for (let run = 0; run < RUNS; run++) {
    // Random slot assignment per call to control position bias.
    const slotAisX = Math.random() < 0.5
    const cA = slotAisX ? bundleX : bundleY
    const cB = slotAisX ? bundleY : bundleX
    const prompt = buildPrompt(pair.task, cA, cB)
    const out = await callJudge(prompt)
    raw.push({ slotAisX, out })
  }

  const results = Object.fromEntries(
    DIMENSIONS.map((d) => {
      const decoded = raw
        .filter((r) => r.out)
        .map((r) => {
          const v = r.out![d as Dimension] as 'A' | 'B' | 'tie'
          if (v === 'tie') return { verdict: 'tie' as const, reason: r.out![`${d}_reason` as keyof JudgeOutput] as string }
          // Decode slot back to X/Y.
          const isX = (v === 'A' && r.slotAisX) || (v === 'B' && !r.slotAisX)
          return { verdict: isX ? ('X' as const) : ('Y' as const), reason: r.out![`${d}_reason` as keyof JudgeOutput] as string }
        })
      const counts: Record<'X' | 'Y' | 'tie', number> = { X: 0, Y: 0, tie: 0 }
      decoded.forEach((d) => counts[d.verdict]++)
      const verdict = (['X', 'Y', 'tie'] as const).reduce((best, k) => (counts[k] > counts[best] ? k : best), 'tie')
      return [d, { verdict, reasons: decoded.map((d) => d.reason) }]
    }),
  ) as Record<Dimension, { verdict: 'X' | 'Y' | 'tie'; reasons: string[] }>

  return { pairId: pair.pairId, condX: pair.condX, condY: pair.condY, results, raw }
}

// ---- aggregation
type PairResult = Awaited<ReturnType<typeof judgePair>>

function aggregateForTask(task: Task, pairResults: PairResult[]): string {
  const condPairs: Array<[Condition, Condition]> = [
    ['A', 'B'],
    ['A', 'C'],
    ['B', 'C'],
  ]
  const lines: string[] = []
  lines.push(`# LLM judge — ${task}`)
  lines.push('')
  lines.push(`Model: \`${MODEL}\`. Runs per pair: ${RUNS} (majority verdict per dimension). Position-bias controlled by per-call random slot assignment.`)
  lines.push('')
  lines.push('## Win rates by dimension')
  lines.push('')
  lines.push('| Condition pair | Dimension | Cond1 wins | Cond2 wins | Ties | n pairs |')
  lines.push('|----------------|-----------|------------|------------|------|---------|')
  for (const [cx, cy] of condPairs) {
    const rel = pairResults.filter((p) => p.condX === cx && p.condY === cy)
    for (const d of DIMENSIONS) {
      let xw = 0, yw = 0, tw = 0
      for (const r of rel) {
        const v = r.results[d].verdict
        if (v === 'X') xw++
        else if (v === 'Y') yw++
        else tw++
      }
      lines.push(`| ${cx} vs ${cy} | ${d} | ${xw} | ${yw} | ${tw} | ${rel.length} |`)
    }
  }
  lines.push('')
  lines.push('## Per-pair detail')
  lines.push('')
  for (const r of pairResults) {
    lines.push(`### ${r.pairId}`)
    for (const d of DIMENSIONS) {
      const decoded = r.results[d].verdict === 'X' ? r.condX : r.results[d].verdict === 'Y' ? r.condY : 'tie'
      lines.push(`- **${d}**: ${decoded} — ${r.results[d].reasons[0] ?? ''}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// ---- main
async function main() {
  if (!DRY && !process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set')
    process.exit(2)
  }
  const tasks = ONLY_TASK ? [ONLY_TASK] : (TASKS as readonly Task[])

  for (const task of tasks) {
    const pairs = generatePairs(task)
    console.log(`\n=== ${task}: ${pairs.length} pairs × ${RUNS} runs = ${pairs.length * RUNS} judge calls`)
    if (DRY) continue

    const results: PairResult[] = []
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i]
      console.log(`  [${i + 1}/${pairs.length}] ${p.condX} vs ${p.condY}`)
      const r = await judgePair(p)
      results.push(r)
      // Checkpoint per pair so a crash doesn't lose everything.
      fs.mkdirSync(path.join(ROOT, 'findings'), { recursive: true })
      fs.writeFileSync(path.join(ROOT, 'findings', `judge-${task}.raw.json`), JSON.stringify(results, null, 2))
    }

    const md = aggregateForTask(task, results)
    fs.writeFileSync(path.join(ROOT, 'findings', `judge-${task}.md`), md)
    console.log(`  wrote findings/judge-${task}.md`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
