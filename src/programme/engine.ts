// Programme engine: decides today's session and applies the progression and
// pain rules of docs/EVIDENCE.md (R1–R8). Pure functions over the training
// history, so they can be tested without a database.
import type { ExerciseClass, Group, Region } from '../exercises/types'
import { LADDERS, ROTATION, TEMPLATES, type Ladder, type SessionType } from './ladders'

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
for (const l of Object.values(LADDERS)) for (const st of l.steps) LADDER_OF.set(st.id, l.id)

export const ladderOfExercise = (exerciseId: string) => LADDER_OF.get(exerciseId)

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
  const exIds = new Set(ladder.steps.map((s) => s.id))
  const ids = new Set(input.sets.filter((s) => !s.deleted && exIds.has(s.exercise_id)).map((s) => s.session_id))
  return completed(input)
    .filter((s) => ids.has(s.id))
    .reverse()
}

function ladderRegions(input: EngineInput, ladder: Ladder): Set<Region> {
  return new Set(ladder.steps.flatMap((st) => input.catalogue(st.id)?.regions ?? []))
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

const REST: Record<ExerciseClass, number> = { strength: 75, endurance: 45, hold: 45, cuff: 45, stretch: 10, drill: 0 }

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
  const last = sessionsWith(input, info.id)[0]
  if (!last) return lo
  const best = Math.max(...setsOf(input, last.id, info.id).map(amount))
  return Math.min(hi, Math.max(lo, best + (info.measure === 'reps' ? 1 : 5)))
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
  if (deload) reasons.push(`Week ${week} is a lighter (deload) week: half the sets, easy effort.`)
  if (week <= 2) reasons.push('Re-entry weeks: 2 sets per exercise, stop with 3–4 reps in reserve.')

  const template = TEMPLATES[type]
  const items: PlanItem[] = []
  // How many sessions of this type are done: rotates multi-ladder slots.
  const typeCount = history.filter((t) => t === type).length

  const item = (phase: Phase, exerciseId: string, sets: number, ladderId?: string, notes: string[] = []) =>
    buildItem(input, { phase, exerciseId, sets, ladderId, notes })

  for (const id of template.warmup) {
    const it = item('warmup', id, 1)
    if (it) items.push(it)
  }

  for (const slot of template.main) {
    let sets = slot.sets
    if ('exercise' in slot) {
      const it = item('main', slot.exercise, deload ? Math.ceil(sets / 2) : sets)
      if (it) items.push(it)
      continue
    }
    const ids = Array.isArray(slot.ladder) ? slot.ladder : [slot.ladder]
    const ladder = LADDERS[ids[typeCount % ids.length]]
    const notes: string[] = []
    const regions = ladderRegions(input, ladder)
    const recent = sessionsWithLadder(input, ladder)

    // R7: next-morning flare-ups.
    const flaredLast = recent[0] && worseAfter(input, recent[0], regions)
    const flaredTwice = flaredLast && recent[1] && worseAfter(input, recent[1], regions)
    if (flaredTwice && daysBetween(localDay(recent[0].started_at), input.today) < 7) {
      warnings.push(
        `${ladder.name}: joint pain was worse the morning after the last two sessions. Paused for a week; a physiotherapist review is advised.`,
      )
      continue
    }
    if (week <= 2) sets = Math.min(sets, 2)
    if (flaredLast) {
      sets = Math.max(1, Math.round((sets * 2) / 3))
      notes.push('Fewer sets: pain was worse the morning after last time.')
    }
    if (deload) sets = Math.ceil(sets / 2)
    if (!recent.length) notes.push('First time: stop at 2 reps in reserve or pain 3/10, whichever comes first.')

    const step = currentStep(input, ladder, week)
    const it = item('main', ladder.steps[step].id, sets, ladder.id, notes)
    if (it) items.push(it)
  }

  const firstMain = items.find((i) => i.phase === 'main' && i.rir !== null)
  if (firstMain && type !== 'D') firstMain.notes.unshift('Warm-up set first: one easy set at 4+ reps in reserve (not logged).')

  for (const id of template.cooldown) {
    const it = item('cooldown', id, 1, undefined, ['Optional: skip it if you are short of time.'])
    if (it) items.push(it)
  }

  const plan = { type, week, deload, reasons, warnings, items, minutes: 0 }
  plan.minutes = Math.round(estimateSeconds(plan, input.catalogue) / 60)
  return plan
}

// ---------------------------------------------------------------- duration

/** Seconds per rep used for time estimates (controlled tempo). */
const SECONDS_PER_REP = 3
const TRANSITION = 15

/** Rough session length: work, rest between sets, side switches and transitions. */
export function estimateSeconds(plan: Pick<Plan, 'items' | 'type'>, catalogue: (id: string) => ExerciseInfo | undefined): number {
  let total = 0
  for (const it of plan.items) {
    const info = catalogue(it.exerciseId)
    const sides = info?.perSide ? 2 : 1
    const amount = it.phase === 'main' ? it.suggested : it.target[0]
    const work = (it.measure === 'reps' ? amount * SECONDS_PER_REP : amount) * sides + (sides - 1) * 5
    total += it.sets * work + Math.max(0, it.sets - 1) * it.restSeconds + TRANSITION
  }
  // The easy warm-up set of the first exercise (not part of the plan items).
  const first = plan.items.find((i) => i.phase === 'main' && i.rir !== null)
  if (first && plan.type !== 'D' && plan.type !== STRETCH_TOP_UP) total += 40
  return total
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
    counts.set(info.group, (counts.get(info.group) ?? 0) + 1)
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
  const sameDay = new Set(type === 'D' ? [] : TEMPLATES[type].main.flatMap((s) => ('ladder' in s ? [s.ladder].flat() : [])))
  const weekly = weeklySetsByGroup(input)
  const legs = legsBlocked(input).blocked

  const candidates = (['A', 'B', 'C'] as const)
    .flatMap((t) => TEMPLATES[t].main.flatMap((s) => ('ladder' in s ? [s.ladder].flat() : [])))
    .filter((id, i, all) => all.indexOf(id) === i && !used.has(id))
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
    ids = [0, 1, 2, 3].map((k) => TOP_UP_POOL[(dayIndex * 3 + k) % TOP_UP_POOL.length])
    const doneToday = input.sessions.find((s) => !s.deleted && s.ended_at && localDay(s.started_at) === input.today && isType(s.day_type))
    const skip = doneToday ? TEMPLATES[doneToday.day_type as SessionType].cooldown : []
    ids = ids.filter((id) => !skip.includes(id)).slice(0, 3)
  }
  const items = ids.flatMap((id) => {
    const it = buildItem(input, { phase: 'cooldown', exerciseId: id, sets: 1 })
    return it ? [it] : []
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
  p.minutes = Math.round(estimateSeconds(p, input.catalogue) / 60)
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
  const exerciseIds = [...new Set(input.sets.filter((s) => !s.deleted && s.session_id === sessionId).map((s) => s.exercise_id))]

  for (const exerciseId of exerciseIds) {
    const ladderId = ladderOfExercise(exerciseId)
    const info = input.catalogue(exerciseId)
    if (!ladderId || !info) continue
    const ladder = LADDERS[ladderId]
    const from = ladder.steps.findIndex((st) => st.id === exerciseId)
    const sets = setsOf(input, sessionId, exerciseId)
    const [lo, hi] = info.target
    const maxPain = Math.max(0, ...sets.map((s) => s.pain ?? 0))

    // A step tried "just today" does not move the ladder: a harder one is a
    // one-off; an easier one only counts for the pain rule.
    const current = currentStep(input, ladder, week)
    if (from > current) continue
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

    // R7 performance drop: below the range in two consecutive sessions without pain.
    const below = (sid: string) => {
      const ss = setsOf(input, sid, exerciseId)
      return ss.length > 0 && Math.max(...ss.map(amount)) < lo && Math.max(0, ...ss.map((s) => s.pain ?? 0)) <= 2
    }
    const previous = sessionsWith(input, exerciseId).find((s) => s.id !== sessionId && s.started_at < session.started_at)
    if (below(sessionId) && previous && below(previous.id) && from > 0) {
      updates.push({ ladderId, from, to: from - 1, reason: 'Below the target range twice in a row: one step easier.' })
      continue
    }

    const allTop = sets.length > 0 && sets.every((s) => amount(s) >= hi && (s.rir ?? 0) >= 2)
    if (allTop && !deload && from < ladder.steps.length - 1) {
      const next = ladder.steps[from + 1]
      if ((next.minWeek ?? 0) > week) continue
      updates.push({ ladderId, from, to: from + 1, reason: `Top of the range with reps to spare: next step, ${input.catalogue(next.id)?.name ?? next.id}.` })
    }
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
    const performed = ladder.steps.findIndex((st) => st.id === exerciseId)
    // Already moved down after the session itself (pain during the set): do not drop twice.
    if (current < performed) continue
    if (current > 0) updates.push({ ladderId, from: current, to: current - 1, reason: 'Joint worse the next morning: one step easier and fewer sets.' })
  }
  return updates
}
