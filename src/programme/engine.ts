// Programme engine: decides today's session and applies the progression and
// pain rules of docs/EVIDENCE.md (R1–R8). Pure functions over the training
// history, so they can be tested without a database.
import type { ExerciseClass, Group, Region } from '../exercises/types'
import { LADDERS, NOT_WITH, ROTATION, slotLadders, TEMPLATES, type Ladder, type SessionType } from './ladders'
import { buildTimeline, totalSeconds, type Interval } from './timeline'

// ---------------------------------------------------------------- inputs

export type ExerciseInfo = {
  id: string
  name: string
  cls: ExerciseClass
  measure: 'reps' | 'seconds'
  target: readonly [number, number]
  regions: Region[]
  perSide?: boolean
  group?: Group
  /** Variations (R12): the step varied and the difficulty compared with it. */
  variationOf?: string
  difficulty?: 'easier' | 'similar' | 'harder'
  kneeLoad?: 'low' | 'medium' | 'high'
  wristLoad?: 'low' | 'medium' | 'high'
  /** For timed dynamic moves: only those with 'strength' count as sets (R16). */
  components?: ('strength' | 'mobility' | 'pulse')[]
}

export type DoneSession = { id: string; day_type: string; started_at: string; ended_at: string | null; deleted: boolean }
export type DoneSet = {
  session_id: string
  exercise_id: string
  set_index: number
  reps: number | null
  seconds: number | null
  rir: number | null
  pain: number | null
  deleted: boolean
}
export type Cycling = 'none' | 'easy' | 'hard'
export type Morning = Partial<Record<Region, 'same' | 'worse'>>
export type DayLog = { day: string; cycling: Cycling | null; morning: Morning | null }

export type EngineInput = {
  /** Local calendar day, YYYY-MM-DD. */
  today: string
  sessions: DoneSession[]
  sets: DoneSet[]
  /** Current step index per ladder id; missing ladders start at their default step. */
  steps: Record<string, number>
  days: DayLog[]
  catalogue: (id: string) => ExerciseInfo | undefined
}

// ---------------------------------------------------------------- outputs

export type Phase = 'warmup' | 'main' | 'cooldown'

/** Blocks of a timed session (R14): increasing complexity, then a wind-down. */
export type Block = 'ramp' | 'build' | 'peak' | 'winddown'

export type PlanItem = {
  phase: Phase
  exerciseId: string
  ladderId?: string
  sets: number
  target: readonly [number, number]
  measure: 'reps' | 'seconds'
  /** Suggested reps or seconds for each working set. */
  suggested: number
  /** Target reps in reserve; null for drills and stretches. */
  rir: number | null
  restSeconds: number
  notes: string[]
  /** A readiness test for an advanced step (R13 G6) instead of working sets. */
  test?: { stepId: string; text: string; painMax: number; caution: boolean }
  /** Timed sessions (R14, R15): block, work and rest per interval in seconds, and rounds. */
  block?: Block
  work?: number
  rest?: number
  rounds?: number
}

/** Programme sessions A–D, plus 'S' for an optional stretch top-up (not part of the rotation). */
export type PlanType = SessionType | 'S'
export const STRETCH_TOP_UP = 'S'

export type Plan = {
  type: PlanType
  week: number
  deload: boolean
  /** Estimated duration in minutes. */
  minutes: number
  /** Why the session differs from the plain rotation, if it does. */
  reasons: string[]
  warnings: string[]
  items: PlanItem[]
  /** Timed sessions: the order of work intervals (circuits interleave items). */
  intervals?: Interval[]
}

export type LadderUpdate = { ladderId: string; from: number; to: number; reason: string }

// ---------------------------------------------------------------- dates

const DAY_MS = 864e5

/** Local calendar day of an ISO timestamp. */
export function localDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS)
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------- history helpers

const isType = (t: string): t is SessionType => t === 'A' || t === 'B' || t === 'C' || t === 'D'

function completed(input: EngineInput): DoneSession[] {
  return input.sessions
    .filter((s) => !s.deleted && s.ended_at !== null && isType(s.day_type))
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
}

/** Programme week, counted from the first completed session (week 1 = days 0–6). */
export function programmeWeek(input: EngineInput): number {
  const first = completed(input)[0]
  if (!first) return 1
  return Math.floor(Math.max(0, daysBetween(localDay(first.started_at), input.today)) / 7) + 1
}

/** R8: every 6th week is a deload week. */
export const isDeloadWeek = (week: number) => week % 6 === 0

/**
 * Next session in the rotation (R1). A session swapped away because of a hard
 * ride is owed and comes back on the next suitable day.
 */
export function dueType(history: SessionType[]): { due: SessionType; position: number; owed: SessionType | null } {
  let p = 0
  let owed: SessionType | null = null
  for (const t of history) {
    if (owed && t === owed) {
      owed = null
    } else if (t === ROTATION[p % ROTATION.length]) {
      p++
    } else if (t === ROTATION[(p + 1) % ROTATION.length]) {
      owed = owed ?? ROTATION[p % ROTATION.length]
      p += 2
    } else {
      p++ // a manually chosen session fills the current slot
    }
  }
  return { due: owed ?? ROTATION[p % ROTATION.length], position: p, owed }
}

const LADDER_OF = new Map<string, string>()
const STEP_OF = new Map<string, string>()
for (const l of Object.values(LADDERS))
  for (const st of l.steps)
    for (const id of [st.id, ...(st.variants ?? [])]) {
      LADDER_OF.set(id, l.id)
      STEP_OF.set(id, st.id)
    }

export const ladderOfExercise = (exerciseId: string) => LADDER_OF.get(exerciseId)
/** The ladder step an exercise belongs to: itself, or the step a variation varies (R12). */
export const stepOf = (exerciseId: string) => STEP_OF.get(exerciseId) ?? exerciseId
/** Index of an exercise's step in its ladder (-1 if it is not on the ladder). */
export const stepIndex = (ladder: Ladder, exerciseId: string) => ladder.steps.findIndex((st) => st.id === stepOf(exerciseId))

/** Exercise ID under which a readiness test result is logged (R13 G6): reps 1 = passed, 0 = not passed. */
export const testId = (stepId: string) => `test:${stepId}`

/** A ladder whose first step is gated (the crawl ladder) stays closed until that step is unlocked. */
export const isOpen = (input: Pick<EngineInput, 'steps'>, ladder: Ladder) => !ladder.steps[0].gate || input.steps[ladder.id] !== undefined

function amount(s: DoneSet): number {
  return s.reps ?? s.seconds ?? 0
}

/** Working sets of one exercise in one session. */
function setsOf(input: EngineInput, sessionId: string, exerciseId: string): DoneSet[] {
  return input.sets.filter((s) => !s.deleted && s.session_id === sessionId && s.exercise_id === exerciseId)
}

/** Completed sessions containing the exercise, most recent first. */
function sessionsWith(input: EngineInput, exerciseId: string): DoneSession[] {
  const ids = new Set(input.sets.filter((s) => !s.deleted && s.exercise_id === exerciseId).map((s) => s.session_id))
  return completed(input)
    .filter((s) => ids.has(s.id))
    .reverse()
}

function sessionsWithLadder(input: EngineInput, ladder: Ladder): DoneSession[] {
  const exIds = new Set(ladder.steps.flatMap((s) => [s.id, ...(s.variants ?? [])]))
  const ids = new Set(input.sets.filter((s) => !s.deleted && exIds.has(s.exercise_id)).map((s) => s.session_id))
  return completed(input)
    .filter((s) => ids.has(s.id))
    .reverse()
}

function ladderRegions(input: EngineInput, ladder: Ladder): Set<Region> {
  return new Set(ladder.steps.flatMap((st) => [st.id, ...(st.variants ?? [])].flatMap((id) => input.catalogue(id)?.regions ?? [])))
}

type Counting = 'all' | 'progress' | 'performance'

/**
 * Sets of one ladder step in a session: the standard version and its
 * variations (R12). 'progress' leaves out easier variations (R6.2, R13 G1);
 * 'performance' keeps the standard version and similar ones (R7).
 */
function stepSets(input: EngineInput, sessionId: string, stepId: string, counting: Counting = 'all'): DoneSet[] {
  return input.sets.filter((s) => {
    if (s.deleted || s.session_id !== sessionId || stepOf(s.exercise_id) !== stepId) return false
    if (s.exercise_id === stepId || counting === 'all') return true
    const d = input.catalogue(s.exercise_id)?.difficulty
    return counting === 'progress' ? d !== 'easier' : d === 'similar'
  })
}

/** Completed sessions with sets on a step (any version), most recent first. */
function sessionsWithStep(input: EngineInput, stepId: string, counting: Counting = 'all'): DoneSession[] {
  return completed(input)
    .filter((s) => stepSets(input, s.id, stepId, counting).length > 0)
    .reverse()
}

const maxPainOf = (sets: DoneSet[]) => Math.max(0, ...sets.map((s) => s.pain ?? 0))

/** Sessions started in the last `days` days, today included. */
function sessionsSince(input: EngineInput, days: number): Set<string> {
  const since = addDays(input.today, -days)
  return new Set(input.sessions.filter((s) => !s.deleted && localDay(s.started_at) > since).map((s) => s.id))
}

/** The morning check-in recorded on the day after a session, if any. */
function morningAfter(input: EngineInput, session: DoneSession): Morning | null {
  const next = addDays(localDay(session.started_at), 1)
  return input.days.find((d) => d.day === next)?.morning ?? null
}

function worseAfter(input: EngineInput, session: DoneSession, regions: Set<Region>): boolean {
  const m = morningAfter(input, session)
  return !!m && [...regions].some((r) => m[r] === 'worse')
}

// ---------------------------------------------------------------- planning

function currentStep(input: EngineInput, ladder: Ladder, week: number): number {
  let step = Math.min(Math.max(input.steps[ladder.id] ?? ladder.start, 0), ladder.steps.length - 1)
  while (step > 0 && (ladder.steps[step].minWeek ?? 0) > week) step--
  return step
}

const REST: Record<ExerciseClass, number> = { strength: 75, endurance: 45, hold: 45, cuff: 45, stretch: 10, drill: 0, flow: 20 }

function targetRir(info: ExerciseInfo, week: number, deload: boolean): number | null {
  if (info.cls === 'stretch' || info.cls === 'drill') return null
  if (deload) return 4 // R8
  if (week <= 2) return 3 // R5 re-entry: RIR 3–4
  if (info.regions.length) return 2 // symptomatic joints: RIR 2–3, never to failure
  if (info.cls === 'endurance' || info.cls === 'cuff') return 1 // low-risk isolation
  return 2
}

function suggestion(input: EngineInput, info: ExerciseInfo): number {
  const [lo, hi] = info.target
  const reps = info.measure === 'reps'
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n))
  const last = sessionsWith(input, info.id)[0]
  const best = (s: DoneSession, id: string) => Math.max(...setsOf(input, s.id, id).map(amount))
  // R12: a variation uses its own last result within 6 weeks, otherwise the
  // standard version's last result minus 2 reps (10 s).
  if (info.variationOf && !(last && daysBetween(localDay(last.started_at), input.today) <= 42)) {
    const base = sessionsWith(input, info.variationOf)[0]
    return base ? clamp(best(base, info.variationOf) - (reps ? 2 : 10)) : lo
  }
  if (!last) return lo
  return clamp(best(last, info.id) + (reps ? 1 : 5))
}

// ---------------------------------------------------------------- variations (R12)

const LOAD = { low: 0, medium: 1, high: 2 } as const

/** A joint region that is irritated: pain 3/10 or more in the last 14 days, or a worse morning in the last 7. */
function regionFlagged(input: EngineInput, region: Region): boolean {
  const recent = sessionsSince(input, 14)
  const painful = input.sets.some((s) => !s.deleted && recent.has(s.session_id) && (s.pain ?? 0) >= 3 && input.catalogue(s.exercise_id)?.regions.includes(region))
  const since = addDays(input.today, -7)
  return painful || input.days.some((d) => d.day > since && d.morning?.[region] === 'worse')
}

/** R12.5: the variation loads an irritated joint more than the standard version. */
function riskier(input: EngineInput, baseId: string, variantId: string): boolean {
  const base = input.catalogue(baseId)
  const v = input.catalogue(variantId)
  if (!base || !v) return true
  const more: Region[] = []
  if (LOAD[v.kneeLoad ?? 'low'] > LOAD[base.kneeLoad ?? 'low']) more.push('knee')
  if (LOAD[v.wristLoad ?? 'low'] > LOAD[base.wristLoad ?? 'low']) more.push('wrist')
  for (const r of v.regions) if (!base.regions.includes(r) && !more.includes(r)) more.push(r)
  return more.some((r) => regionFlagged(input, r))
}

/** R12.6: a variation that caused pain 4/10 or more, or two worse mornings, rests for 4 weeks. */
function variationRested(input: EngineInput, variantId: string): boolean {
  const recent = sessionsSince(input, 28)
  if (input.sets.some((s) => !s.deleted && recent.has(s.session_id) && s.exercise_id === variantId && (s.pain ?? 0) >= 4)) return true
  const regions = new Set(input.catalogue(variantId)?.regions ?? [])
  const worse = sessionsWith(input, variantId).filter((s) => recent.has(s.id) && worseAfter(input, s, regions))
  return worse.length >= 2
}

const weekAfterDeload = (week: number) => week > 6 && (week - 1) % 6 === 0

/**
 * R12 rotation: the standard version for the first 2 sessions on a step, then
 * the standard version and variations in turn (S, V1, S, V2 …), with at most
 * 3 variations (1 in an alternating slot). Standard only in weeks 1–2, deload
 * weeks and the week after, after a pain event on the ladder, and when a
 * variation would load an irritated joint more.
 */
function chooseVersion(input: EngineInput, ladder: Ladder, step: number, alternating: boolean, week: number): string {
  const st = ladder.steps[step]
  const variants = (st.variants ?? []).filter((v) => input.catalogue(v) && !variationRested(input, v)).slice(0, alternating ? 1 : 3)
  if (!variants.length || week <= 2 || isDeloadWeek(week) || weekAfterDeload(week)) return st.id
  const n = sessionsWithStep(input, st.id).length
  if (n < 2) return st.id
  const last = sessionsWithLadder(input, ladder)[0]
  const lastSets = last ? input.sets.filter((s) => !s.deleted && s.session_id === last.id && ladderOfExercise(s.exercise_id) === ladder.id) : []
  if (last && (maxPainOf(lastSets) >= 3 || worseAfter(input, last, ladderRegions(input, ladder)))) return st.id
  const k = n - 2
  if (k % 2 === 0) return st.id
  const v = variants[((k - 1) / 2) % variants.length]
  return riskier(input, st.id, v) ? st.id : v
}

// ---------------------------------------------------------------- advanced steps (R13)

/** G1: in 2 of the last 3 sessions on the step, every counting set reached the top of the range with 2+ in reserve. */
function mastered(input: EngineInput, stepId: string): boolean {
  const info = input.catalogue(stepId)
  if (!info) return false
  // R16 in the timed format: rated too easy in 2 of the last 3 sessions.
  const top = sessionsWithStep(input, stepId, 'progress')
    .slice(0, 3)
    .filter((s) => ratingOf(stepSets(input, s.id, stepId, 'progress')) === 'easy')
  return top.length >= 2
}

/** R13 G1–G5 for a gated step; the readiness test (G6) is offered once these hold. */
export function gateStatus(input: EngineInput, ladder: Ladder, index: number): { ok: boolean; missing: string[] } {
  const gate = ladder.steps[index]?.gate
  if (!gate) return { ok: true, missing: [] }
  const week = programmeWeek(input)
  const missing: string[] = []
  if (![gate.prereq, ...(gate.alsoMastered ?? [])].every((id) => mastered(input, id))) missing.push('mastery')
  for (const r of gate.requires ?? []) {
    const other = LADDERS[r.ladder]
    if (!isOpen(input, other) || currentStep(input, other, week) < other.steps.findIndex((st) => st.id === r.atLeast)) missing.push(`${other.name} step`)
  }
  // G2: pain 2/10 or less for 4 weeks on the joints the step loads (or on the ladder itself).
  const recent = sessionsSince(input, 28)
  const loads = (id: string) => (gate.regions.length ? gate.regions.some((r) => input.catalogue(id)?.regions.includes(r)) : ladderOfExercise(id) === ladder.id)
  if (input.sets.some((s) => !s.deleted && recent.has(s.session_id) && (s.pain ?? 0) > 2 && loads(s.exercise_id))) missing.push('pain')
  // G3: no worse morning for those joints in 2 weeks.
  const since = addDays(input.today, -14)
  if (input.days.some((d) => d.day > since && gate.regions.some((r) => d.morning?.[r] === 'worse'))) missing.push('morning')
  // G5: timing.
  if (week < gate.minWeek || isDeloadWeek(week) || weekAfterDeload(week)) missing.push('timing')
  return { ok: missing.length === 0, missing }
}

/** Most recent readiness test result for a step: day and whether it passed. */
function lastTest(input: EngineInput, stepId: string, painMax: number): { day: string; passed: boolean } | null {
  const byId = new Map(input.sessions.filter((s) => !s.deleted).map((s) => [s.id, s]))
  const tests = input.sets
    .filter((s) => !s.deleted && s.exercise_id === testId(stepId) && byId.has(s.session_id))
    .map((s) => ({ day: localDay(byId.get(s.session_id)!.started_at), passed: s.reps === 1 && (s.pain ?? 0) <= painMax }))
    .sort((a, b) => a.day.localeCompare(b.day))
  return tests.at(-1) ?? null
}

/** The gated step a session on `stepId` can test for, if R13 G1–G5 hold and no test was tried in the last 7 days. */
function testFor(input: EngineInput, stepId: string, week: number): { ladder: Ladder; index: number } | null {
  for (const ladder of Object.values(LADDERS)) {
    const index = isOpen(input, ladder) ? currentStep(input, ladder, week) + 1 : 0
    const gate = ladder.steps[index]?.gate
    if (!gate || gate.prereq !== stepId || !input.catalogue(ladder.steps[index].id)) continue
    const last = lastTest(input, ladder.steps[index].id, gate.painMax ?? 2)
    if (last && daysBetween(last.day, input.today) < 7) continue
    if (gateStatus(input, ladder, index).ok) return { ladder, index }
  }
  return null
}

/** One plan entry for an exercise, with targets from the history (R4–R6). */
export function buildItem(
  input: EngineInput,
  { phase, exerciseId, sets, ladderId, notes = [] }: { phase: Phase; exerciseId: string; sets: number; ladderId?: string; notes?: string[] },
): PlanItem | null {
  const info = input.catalogue(exerciseId)
  if (!info) return null
  const week = programmeWeek(input)
  return {
    phase,
    exerciseId,
    ladderId,
    sets,
    target: info.target,
    measure: info.measure,
    suggested: phase === 'main' ? suggestion(input, info) : info.target[0],
    rir: phase === 'main' ? targetRir(info, week, isDeloadWeek(week)) : null,
    restSeconds: phase === 'main' ? REST[info.cls] : 0,
    notes,
  }
}

/** R1: no legs session on a hard cycling day, nor the day after one if the knee flared after the last legs session. */
function legsBlocked(input: EngineInput): { blocked: boolean; hardToday: boolean } {
  const today = input.days.find((d) => d.day === input.today)
  const yesterday = input.days.find((d) => d.day === addDays(input.today, -1))
  const lastB = completed(input).filter((s) => s.day_type === 'B').at(-1)
  const kneeFlaredAfterB = !!lastB && morningAfter(input, lastB)?.knee === 'worse'
  const hardToday = today?.cycling === 'hard'
  return { blocked: hardToday || (yesterday?.cycling === 'hard' && kneeFlaredAfterB), hardToday }
}

/** R15: work and rest seconds and rounds per block, by programme week. */
export function timing(input: EngineInput, week: number): Record<Block, { work: number; rest: number; rounds: number }> {
  const deload = isDeloadWeek(week)
  const reentry = week <= 2
  const easy = reentry || deload
  const peakWork = !easy && week >= 8 && peakStageOk(input) ? 45 : easy ? 30 : 40
  return {
    ramp: { work: 40, rest: 5, rounds: 1 },
    build: { work: easy ? 30 : 40, rest: easy ? 30 : 20, rounds: deload ? 1 : 2 },
    peak: { work: peakWork, rest: 60 - peakWork, rounds: easy ? 1 : 2 },
    winddown: { work: 30, rest: 5, rounds: 1 },
  }
}

/** R15 stage gate for 45/15 in Peak: in the last 7 days, no Peak exercise rated too hard twice, no pain of 4/10 or more, no worse morning. */
function peakStageOk(input: EngineInput): boolean {
  const recent = sessionsSince(input, 7)
  const sets = input.sets.filter((x) => !x.deleted && recent.has(x.session_id))
  if (sets.some((x) => (x.pain ?? 0) >= 4)) return false
  const since = addDays(input.today, -7)
  if (input.days.some((d) => d.day > since && d.morning && Object.values(d.morning).includes('worse'))) return false
  const hardSessions = new Set(sets.filter((x) => (x.rir ?? 2) <= 0 && input.catalogue(x.exercise_id)?.cls === 'flow').map((x) => x.session_id))
  return hardSessions.size < 2
}

/** A ladder step's own conditions (Y ladders): other ladders far enough, joints calm. */
function stepAllowed(input: EngineInput, ladder: Ladder, index: number, week: number): boolean {
  const st = ladder.steps[index]
  if (!st) return false
  for (const r of st.requires ?? []) {
    const other = LADDERS[r.ladder]
    if (!isOpen(input, other) || currentStep(input, other, week) < other.steps.findIndex((x) => x.id === r.atLeast)) return false
  }
  return (st.calm ?? []).every((region) => !regionFlagged(input, region))
}

/** Current step, stepped down past any step whose conditions no longer hold; -1 if none can be used. */
function usableStep(input: EngineInput, ladder: Ladder, week: number, maxStep?: string): number {
  let step = currentStep(input, ladder, week)
  if (maxStep) step = Math.min(step, ladder.steps.findIndex((x) => x.id === maxStep))
  while (step >= 0 && !stepAllowed(input, ladder, step, week)) step--
  return step
}

/** The last rating given to an exercise: 'easy', 'right' or 'hard' (R16), from reps in reserve. */
function lastRating(input: EngineInput, exerciseId: string): Rating | null {
  const last = sessionsWith(input, exerciseId)[0]
  return last ? ratingOf(setsOf(input, last.id, exerciseId)) : null
}

export type Rating = 'easy' | 'right' | 'hard'
/** Rating of a set of logs: too easy if every set had 4+ in reserve, too hard if any had none. */
export function ratingOf(sets: DoneSet[]): Rating | null {
  if (!sets.length) return null
  if (sets.some((x) => (x.rir ?? 2) <= 0)) return 'hard'
  return sets.every((x) => (x.rir ?? 0) >= 4) ? 'easy' : 'right'
}

const BLOCK_PHASE: Record<Block, Phase> = { ramp: 'warmup', build: 'main', peak: 'main', winddown: 'cooldown' }

export function plan(input: EngineInput, override?: SessionType): Plan {
  const week = programmeWeek(input)
  const deload = isDeloadWeek(week)
  const history = completed(input).map((s) => s.day_type as SessionType)
  const { due, position } = dueType(history)
  const reasons: string[] = []
  const warnings: string[] = []

  // R1 cycling adjustment: no legs session on a hard cycling day.
  const legs = legsBlocked(input)

  let type: SessionType = override ?? due
  if (!override && type === 'B' && legs.blocked) {
    for (let i = 0; i < ROTATION.length; i++) {
      const candidate = ROTATION[(position + i) % ROTATION.length]
      if (candidate !== 'B') {
        type = candidate
        break
      }
    }
    reasons.push(
      legs.hardToday
        ? 'Hard ride today, so the legs session moves to the next day.'
        : 'Hard ride yesterday and knee pain after the last legs session, so legs move to another day.',
    )
  }
  if (deload) reasons.push(`Week ${week} is a lighter (deload) week: one round each, easy effort.`)
  if (week <= 2) reasons.push('Re-entry weeks: 30 s work and 30 s rest, stop with 3–4 reps in reserve.')
  if (legs.hardToday && type !== 'B') reasons.push('Hard ride today: the pulse block stays moderate, with no leg stations.')

  const template = TEMPLATES[type]
  const time = timing(input, week)
  const items: PlanItem[] = []
  // How many sessions of this type are done: rotates multi-ladder slots.
  const typeCount = history.filter((t) => t === type).length

  const add = (block: Block, exerciseId: string, ladderId: string | undefined, notes: string[] = [], rounds = time[block].rounds) => {
    const it = buildItem(input, { phase: BLOCK_PHASE[block], exerciseId, sets: rounds, ladderId, notes })
    if (!it) return null
    const full: PlanItem = { ...it, block, work: time[block].work, rest: time[block].rest, rounds }
    if (block === 'ramp' || block === 'winddown') Object.assign(full, { rir: null, restSeconds: 0 })
    items.push(full)
    return full
  }

  // Ramp: easy moves that warm up; the primer is the first Build ladder made easier (R14).
  for (const slot of template.ramp) {
    if ('exercise' in slot) add('ramp', slot.exercise, undefined)
    else if ('rampOf' in slot) {
      const ladder = LADDERS[slot.rampOf]
      const step = Math.max(0, usableStep(input, ladder, week) - 1)
      add('ramp', ladder.steps[step].id, undefined)
    } else if ('primer' in slot) {
      const ladder = LADDERS[slot.primer]
      const step = Math.max(0, usableStep(input, ladder, week) - slot.below)
      add('ramp', ladder.steps[step].id, undefined, ['Primer: an easier step of the first exercise, 4 or more reps in reserve.'])
    }
  }

  for (const block of ['build', 'peak'] as const) {
    for (const slot of template[block]) {
      if ('exercise' in slot) {
        add(block, legs.hardToday && slot.hardRide ? slot.hardRide : slot.exercise, undefined)
        continue
      }
      if (!('ladder' in slot)) continue
      const all = Array.isArray(slot.ladder) ? slot.ladder : [slot.ladder]
      const ids = all.filter((id) => isOpen(input, LADDERS[id]) && usableStep(input, LADDERS[id], week, slot.maxStep) >= 0)
      const pick = all[typeCount % all.length]
      const ladderId = ids.includes(pick) ? pick : ids[typeCount % Math.max(1, ids.length)]
      if (!ladderId) {
        if (slot.fallback) add(block, slot.fallback, undefined)
        continue
      }
      const ladder = LADDERS[ladderId]
      const step = usableStep(input, ladder, week, slot.maxStep)
      const stepIsLegs = ['legs', 'hips'].includes(input.catalogue(ladder.steps[step].id)?.group ?? '')
      if (legs.hardToday && block === 'peak' && (slot.hardRide || stepIsLegs)) {
        if (slot.hardRide) add(block, slot.hardRide, undefined)
        continue
      }

      const notes: string[] = []
      let rounds = slot.rounds ?? time[block].rounds
      const regions = ladderRegions(input, ladder)
      const recent = sessionsWithLadder(input, ladder)
      // R7: next-morning flare-ups.
      const flaredLast = recent[0] && worseAfter(input, recent[0], regions)
      const flaredTwice = flaredLast && recent[1] && worseAfter(input, recent[1], regions)
      if (flaredTwice && daysBetween(localDay(recent[0].started_at), input.today) < 7) {
        warnings.push(`${ladder.name}: joint pain was worse the morning after the last two sessions. Paused for a week; a physiotherapist review is advised.`)
        continue
      }
      if (flaredLast) {
        rounds = Math.max(1, rounds - 1)
        notes.push('One round less: pain was worse the morning after last time.')
      }
      if (!recent.length) notes.push('First time: keep 2 or more reps in reserve; stop at pain 3/10.')

      const version = block === 'build' ? chooseVersion(input, ladder, step, all.length > 1, week) : ladder.steps[step].id
      if (version !== ladder.steps[step].id) notes.push(`Variation of ${input.catalogue(ladder.steps[step].id)?.name ?? 'your step'}: same progression.`)
      // R16 levers within a step.
      const last = lastRating(input, version)
      if (last === 'easy') notes.push('Felt too easy last time: slow the lowering to 3 s, or move a little further.')
      if (last === 'hard') notes.push('Felt too hard last time: slow down, use a shorter range, or pause when needed.')
      if (block === 'peak') notes.push('Pulse: short phrases only, never all-out.')
      add(block, version, ladder.id, notes, rounds)

      // R13 G6: a readiness test for the next advanced step, done after the intervals.
      const test = !deload ? testFor(input, ladder.steps[step].id, week) : null
      if (test) {
        const st = test.ladder.steps[test.index]
        const gate = st.gate!
        const t = buildItem(input, { phase: 'main', exerciseId: st.id, sets: 1, ladderId: test.ladder.id, notes: ['Readiness test: optional, after the intervals.'] })
        if (t) items.push({ ...t, rir: null, restSeconds: 0, test: { stepId: st.id, text: gate.test, painMax: gate.painMax ?? 2, caution: !!gate.caution } })
      }
    }
  }

  // R12: some variations are not used next to a similar exercise on the same day.
  for (let i = 0; i < items.length; i++) {
    const avoid = NOT_WITH[items[i].exerciseId]
    if (avoid && items.some((o) => avoid.includes(o.exerciseId))) {
      const std = buildItem(input, { phase: 'main', exerciseId: stepOf(items[i].exerciseId), sets: items[i].sets, ladderId: items[i].ladderId })
      if (std) items[i] = { ...items[i], ...std, notes: items[i].notes.filter((n) => !n.startsWith('Variation of')) }
    }
  }

  // Wind-down: slow mobility then stretches; deload weeks add stretching (R14).
  const winddown = [...template.winddown]
  if (deload && type !== 'D') for (const id of ['M1', 'M4', 'M3']) if (!winddown.some((w) => 'exercise' in w && w.exercise === id)) winddown.push({ exercise: id })
  for (const slot of winddown) if ('exercise' in slot) add('winddown', slot.exercise, undefined)

  const p: Plan = { type, week, deload, reasons, warnings, items, minutes: 0 }
  p.intervals = intervalsFor(p.items, input.catalogue)
  fitToLength(p, input.catalogue)
  p.minutes = Math.round(totalSeconds(buildTimeline(p.intervals!)) / 60)
  return p
}

// ---------------------------------------------------------------- intervals (R14, R15)

/** Switch time between sides: 10 s for strength work done one side at a time, 5 s for split mobility (R15). */
const SWITCH = { doubled: 10, split: 5 }

/**
 * Work intervals in session order: the Ramp continuous, Build and Peak as
 * circuits (every slot, then the next round), the Wind-down in order. Per-side
 * strength moves get a full interval per side; per-side mobility in the Ramp
 * shares the time between sides; stretches get 30 s per side (R15).
 */
export function intervalsFor(items: PlanItem[], catalogue: EngineInput['catalogue']): Interval[] {
  const out: Interval[] = []
  const one = (i: number, round: number) => {
    const it = items[i]
    const info = catalogue(it.exerciseId)
    const perSide = !!info?.perSide
    const block = it.block!
    let work = it.work ?? 40
    let sw: number | undefined
    if (perSide) {
      if (block === 'ramp' || (block === 'winddown' && info?.cls !== 'stretch')) {
        work = Math.round(work / 2)
        sw = SWITCH.split
      } else sw = block === 'winddown' ? SWITCH.split : SWITCH.doubled
    } else if (block === 'winddown' && info?.cls === 'stretch') work = 60
    out.push({ item: i, round, work, rest: it.rest ?? 0, perSide, switch: sw })
  }
  const idx = (b: Block) => items.map((it, i) => (it.block === b && !it.test ? i : -1)).filter((i) => i >= 0)
  for (const i of idx('ramp')) one(i, 1)
  for (const b of ['build', 'peak'] as const) {
    const list = idx(b)
    const rounds = Math.max(0, ...list.map((i) => items[i].rounds ?? 1))
    for (let r = 1; r <= rounds; r++) for (const i of list) if ((items[i].rounds ?? 1) >= r) one(i, r)
  }
  for (const i of idx('winddown')) one(i, 1)
  return out
}

/** R14 fit rule: above 16 min, drop a pulse-only Peak round, then the second Wind-down move, then the last Peak round. */
function fitToLength(p: Plan, catalogue: EngineInput['catalogue']) {
  const limit = 16 * 60
  const total = () => totalSeconds(buildTimeline(p.intervals!))
  const peak = p.items.map((it, i) => (it.block === 'peak' && !it.test ? i : -1)).filter((i) => i >= 0)
  const pulseOnly = peak.find((i) => (p.items[i].rounds ?? 1) > 1 && !catalogue(p.items[i].exerciseId)?.components?.includes('strength') && catalogue(p.items[i].exerciseId)?.cls === 'flow')
  const steps: (() => void)[] = [
    () => pulseOnly !== undefined && (p.items[pulseOnly].rounds = 1),
    () => {
      const wd = p.items.map((it, i) => (it.block === 'winddown' ? i : -1)).filter((i) => i >= 0)
      if (wd.length > 1) p.items.splice(wd[1], 1)
    },
    () => {
      const last = peak.at(-1)
      if (last !== undefined && last < p.items.length && p.items[last].block === 'peak') p.items[last].rounds = 1
    },
  ]
  for (const step of steps) {
    if (total() <= limit) return
    step()
    p.items.forEach((it) => it.rounds && (it.sets = it.rounds))
    p.intervals = intervalsFor(p.items, catalogue)
  }
}

// ---------------------------------------------------------------- optional additions

/** R3: at most about 12 hard sets per muscle group per week. */
export const WEEKLY_SET_CAP = 12
const EXTRA_SETS = 2

/** Monday of the week containing `day`. */
function mondayOf(day: string): string {
  const weekday = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
  return addDays(day, -weekday)
}

/** Working sets per muscle group since Monday, including a session in progress. */
export function weeklySetsByGroup(input: EngineInput): Map<Group, number> {
  const monday = mondayOf(input.today)
  const inWeek = new Set(
    input.sessions.filter((s) => !s.deleted && localDay(s.started_at) >= monday && localDay(s.started_at) <= input.today).map((s) => s.id),
  )
  const counts = new Map<Group, number>()
  for (const set of input.sets) {
    if (set.deleted || !inWeek.has(set.session_id)) continue
    const info = input.catalogue(set.exercise_id)
    if (!info?.group || info.cls === 'stretch' || info.cls === 'drill') continue
    if (info.cls === 'flow' && !info.components?.includes('strength')) continue
    // R16: an interval rated too easy (4+ in reserve) counts as half a set.
    counts.set(info.group, (counts.get(info.group) ?? 0) + ((set.rir ?? 0) >= 4 ? 0.5 : 1))
  }
  return counts
}

/**
 * Up to two optional exercises to add after a session (user's choice, October
 * 2026). Candidates are ladders not trained in this session: first the other
 * ladder of a rotating slot, then muscle groups with the fewest sets this week.
 * Nothing is offered in a deload week (R8). A group is left out when two more
 * sets would pass the weekly cap (R3), legs are left out on a hard cycling day
 * (R1), and a ladder is left out after a next-morning flare-up (R7).
 */
export function extraOptions(input: EngineInput, type: PlanType, planned: PlanItem[], max = 2): PlanItem[] {
  const week = programmeWeek(input)
  if (isDeloadWeek(week) || type === STRETCH_TOP_UP) return []
  const used = new Set(planned.map((i) => i.ladderId).filter(Boolean))
  const sameDay = new Set(slotLadders(TEMPLATES[type]))
  const weekly = weeklySetsByGroup(input)
  const legs = legsBlocked(input).blocked

  const candidates = (['A', 'B', 'C'] as const)
    .flatMap((t) => slotLadders(TEMPLATES[t]).filter((id) => !id.startsWith('y')))
    .filter((id, i, all) => all.indexOf(id) === i && !used.has(id) && isOpen(input, LADDERS[id]))
    .flatMap((id) => {
      const ladder = LADDERS[id]
      const exerciseId = ladder.steps[currentStep(input, ladder, week)].id
      const info = input.catalogue(exerciseId)
      if (!info?.group) return []
      if ((weekly.get(info.group) ?? 0) + EXTRA_SETS > WEEKLY_SET_CAP) return []
      if (legs && (info.group === 'legs' || info.group === 'hips')) return []
      const last = sessionsWithLadder(input, ladder)[0]
      if (last && worseAfter(input, last, ladderRegions(input, ladder))) return []
      return [{ id, exerciseId, group: info.group, rank: (sameDay.has(id) ? 0 : 100) + (weekly.get(info.group) ?? 0) }]
    })
    .sort((a, b) => a.rank - b.rank)

  // Prefer two different muscle groups.
  const picked: typeof candidates = []
  for (const c of candidates) if (picked.length < max && !picked.some((p) => p.group === c.group)) picked.push(c)
  for (const c of candidates) if (picked.length < max && !picked.includes(c)) picked.push(c)

  return picked.flatMap((c) => {
    const it = buildItem(input, { phase: 'main', exerciseId: c.exerciseId, sets: EXTRA_SETS, ladderId: c.id, notes: ['Extra exercise: 2 sets at the usual effort.'] })
    return it ? [it] : []
  })
}

/** Stretches for priority regions (R9). The quadriceps stretch (M5) is left out for the knees. */
const TOP_UP_POOL = ['M1', 'M2', 'M4', 'M8', 'M6', 'M3'] as const
/** Hip flexors, hamstrings and calves: the regions a ride shortens or loads most (heuristic). */
const AFTER_RIDE = ['M1', 'M2', 'M4'] as const

/**
 * Optional stretch top-up of about 4 min (R9), added because the shorter
 * sessions stretch less than R9's target. One 30 s hold per stretch and side:
 * the weekly total per region is what matters most (Thomas 2018), so short
 * daily holds add up. After a ride (today or yesterday): hip flexors,
 * hamstrings and calves. Otherwise three stretches rotating by day, skipping
 * the one in today's cool-down.
 */
export function stretchPlan(input: EngineInput, rideToday: boolean): Plan {
  let ids: string[]
  if (rideToday) ids = [...AFTER_RIDE]
  else {
    const dayIndex = Math.round(Date.parse(`${input.today}T12:00:00Z`) / DAY_MS)
    ids = [0, 1, 2, 3, 4].map((k) => TOP_UP_POOL[(dayIndex * 3 + k) % TOP_UP_POOL.length])
    const doneToday = input.sessions.find((s) => !s.deleted && s.ended_at && localDay(s.started_at) === input.today && isType(s.day_type))
    const skip = doneToday ? TEMPLATES[doneToday.day_type as SessionType].winddown.flatMap((w) => ('exercise' in w ? [w.exercise] : [])) : []
    ids = ids.filter((id) => !skip.includes(id)).slice(0, 3)
  }
  const items = ids.flatMap((id) => {
    const it = buildItem(input, { phase: 'cooldown', exerciseId: id, sets: 1 })
    return it ? [{ ...it, block: 'winddown' as const, work: 30, rest: 5, rounds: 1 }] : []
  })
  const p: Plan = {
    type: STRETCH_TOP_UP,
    week: programmeWeek(input),
    deload: false,
    reasons: [rideToday ? 'After your ride: hip flexors, hamstrings and calves.' : 'Extra stretching towards the weekly target.'],
    warnings: [],
    items,
    minutes: 0,
  }
  p.intervals = intervalsFor(p.items, input.catalogue)
  p.minutes = Math.round(totalSeconds(buildTimeline(p.intervals)) / 60)
  return p
}

// ---------------------------------------------------------------- progression

/**
 * Ladder changes after a finished session (R6, R7). Pain decides first; a step
 * up needs every set at the top of the range with 2+ reps in reserve.
 */
export function evaluate(input: EngineInput, sessionId: string): LadderUpdate[] {
  const session = input.sessions.find((s) => s.id === sessionId)
  if (!session) return []
  const week = programmeWeek(input)
  const deload = isDeloadWeek(week)
  const updates: LadderUpdate[] = []
  const logged = input.sets.filter((s) => !s.deleted && s.session_id === sessionId)
  // Variations count for their step (R12).
  const stepIds = [...new Set(logged.filter((s) => ladderOfExercise(s.exercise_id)).map((s) => stepOf(s.exercise_id)))]

  for (const stepId of stepIds) {
    const ladderId = ladderOfExercise(stepId)
    const info = input.catalogue(stepId)
    if (!ladderId || !info) continue
    const ladder = LADDERS[ladderId]
    const from = stepIndex(ladder, stepId)
    const all = stepSets(input, sessionId, stepId)
    const maxPain = maxPainOf(all)

    // A step tried "just today" does not move the ladder: a harder one is a
    // one-off; an easier one only counts for the pain rule.
    const current = currentStep(input, ladder, week)
    if (!isOpen(input, ladder) || from > current) continue
    if (from < current) {
      if (maxPain >= 4 && from > 0) updates.push({ ladderId, from: current, to: from - 1, reason: `Pain ${maxPain}/10 even on the easier variation: one more step easier.` })
      continue
    }

    if (maxPain >= 4) {
      if (from > 0) {
        updates.push({
          ladderId,
          from,
          to: from - 1,
          reason: maxPain > 5 ? `Pain ${maxPain}/10: easier variation next time; consider a review.` : `Pain ${maxPain}/10: easier variation next time.`,
        })
      }
      continue
    }
    if (maxPain === 3) continue // R7: allowed, but no progression

    // R16: ratings from the timed format (too easy = 4+ in reserve, too hard = 0).
    const counting = stepSets(input, sessionId, stepId, 'progress')
    const now = ratingOf(counting)
    const previous = sessionsWithStep(input, stepId, 'progress').find((s) => s.id !== sessionId && s.started_at < session.started_at)
    const before = previous ? ratingOf(stepSets(input, previous.id, stepId, 'progress')) : null
    const beforePain = previous ? maxPainOf(stepSets(input, previous.id, stepId)) : 0

    // Too hard twice in a row (or on the first session on a step in weeks 1–2, R10 calibration): one step easier.
    const performance = ratingOf(stepSets(input, sessionId, stepId, 'performance'))
    if (performance === 'hard' && from > 0 && ((previous && ratingOf(stepSets(input, previous.id, stepId, 'performance')) === 'hard') || (!previous && week <= 2))) {
      updates.push({ ladderId, from, to: from - 1, reason: previous ? 'Too hard twice in a row: one step easier.' : 'Too hard on the first try: one step easier (calibration).' })
      continue
    }

    // Too easy twice in a row, pain 2/10 or less, no worse morning after the previous session: next step.
    const morningOk = !previous || !worseAfter(input, previous, ladderRegions(input, ladder))
    if (now === 'easy' && before === 'easy' && beforePain <= 2 && morningOk && !deload && week > 2 && from < ladder.steps.length - 1) {
      const next = ladder.steps[from + 1]
      // Advanced steps open only through a readiness test (R13); Y steps need their conditions.
      if (next.gate || (next.minWeek ?? 0) > week || !stepAllowed(input, ladder, from + 1, week)) continue
      updates.push({ ladderId, from, to: from + 1, reason: `Too easy twice in a row: next step, ${input.catalogue(next.id)?.name ?? next.id}.` })
    }
  }

  // R13 G6: a passed readiness test unlocks its step if G1–G5 still hold.
  for (const t of logged.filter((s) => s.exercise_id.startsWith('test:'))) {
    const stepId = t.exercise_id.slice('test:'.length)
    const ladderId = ladderOfExercise(stepId)
    if (!ladderId) continue
    const ladder = LADDERS[ladderId]
    const index = stepIndex(ladder, stepId)
    const gate = ladder.steps[index]?.gate
    const open = isOpen(input, ladder)
    const current = open ? currentStep(input, ladder, week) : -1
    if (!gate || index !== current + 1 || t.reps !== 1 || (t.pain ?? 0) > (gate.painMax ?? 2) || !gateStatus(input, ladder, index).ok) continue
    updates.push({ ladderId, from: current, to: index, reason: `Readiness test passed: ${input.catalogue(stepId)?.name ?? stepId} unlocked. Start at the bottom of the range.` })
  }
  return updates
}

/** The finished session that still needs its next-morning check-in, if any (R6, R7). */
export function morningCheckDue(input: EngineInput): { session: DoneSession; regions: Region[] } | null {
  const last = completed(input).filter((s) => s.day_type !== 'D').at(-1)
  if (!last) return null
  const gap = daysBetween(localDay(last.started_at), input.today)
  if (gap < 1 || gap > 2) return null
  const day = addDays(localDay(last.started_at), 1)
  if (input.days.find((d) => d.day === day)?.morning) return null
  const ids = new Set(input.sets.filter((s) => !s.deleted && s.session_id === last.id).map((s) => s.exercise_id))
  const regions = new Set([...ids].flatMap((id) => input.catalogue(id)?.regions ?? []))
  return regions.size ? { session: last, regions: [...regions] } : null
}

/** R7: a joint worse the morning after a session moves its ladders one step down. */
export function morningUpdates(input: EngineInput, sessionId: string, morning: Morning): LadderUpdate[] {
  const worse = new Set((Object.keys(morning) as Region[]).filter((r) => morning[r] === 'worse'))
  if (!worse.size) return []
  const exerciseIds = new Set(input.sets.filter((s) => !s.deleted && s.session_id === sessionId).map((s) => s.exercise_id))
  const updates: LadderUpdate[] = []
  for (const exerciseId of exerciseIds) {
    const ladderId = ladderOfExercise(exerciseId)
    const info = input.catalogue(exerciseId)
    if (!ladderId || !info || !info.regions.some((r) => worse.has(r))) continue
    const ladder = LADDERS[ladderId]
    const current = Math.min(input.steps[ladderId] ?? ladder.start, ladder.steps.length - 1)
    const performed = stepIndex(ladder, exerciseId)
    // Already moved down after the session itself (pain during the set): do not drop twice.
    if (current < performed) continue
    if (current > 0) updates.push({ ladderId, from: current, to: current - 1, reason: 'Joint worse the next morning: one step easier and fewer sets.' })
  }
  return updates
}
