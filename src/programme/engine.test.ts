import { describe, expect, it } from 'vitest'
import type { ExerciseClass, Group, Region } from '../exercises/types'
import { dueType, evaluate, extraOptions, morningCheckDue, morningUpdates, plan, programmeWeek, stretchPlan, weeklySetsByGroup, type DayLog, type DoneSession, type DoneSet, type EngineInput, type ExerciseInfo } from './engine'
import { LADDERS, TEMPLATES, type SessionType } from './ladders'

// Catalogue covering every id used by the ladders and templates.
const SPECIAL: Record<string, Partial<ExerciseInfo>> = {
  P1: { regions: ['shoulder', 'wrist'] },
  P3: { regions: ['shoulder', 'wrist', 'knee'] },
  P4: { regions: ['shoulder', 'wrist'] },
  P5: { regions: ['shoulder', 'wrist'] },
  K1: { cls: 'hold', measure: 'seconds', target: [20, 45], regions: ['knee'] },
  K3: { regions: ['knee'] },
  H1: { cls: 'endurance', target: [10, 20], regions: [] },
  S1: { cls: 'endurance', target: [10, 20], regions: [] },
  S2: { cls: 'endurance', target: [10, 20], regions: [] },
  S3: { cls: 'endurance', target: [10, 20], regions: ['shoulder'] },
}
const allIds = new Set([
  ...Object.values(LADDERS).flatMap((l) => l.steps.map((s) => s.id)),
  ...Object.values(TEMPLATES).flatMap((t) => [...t.warmup, ...t.cooldown, ...t.main.flatMap((s) => ('exercise' in s ? [s.exercise] : []))]),
])
const GROUP: Record<string, Group> = { P: 'push', C: 'core', K: 'legs', F: 'legs', H: 'hips', A: 'hips', S: 'back', E: 'back', M: 'mobility', W: 'warmup' }
const catalogue = (id: string): ExerciseInfo | undefined => {
  if (!allIds.has(id)) return undefined
  const cls: ExerciseClass = id.startsWith('M') ? 'stretch' : id.startsWith('W') ? 'drill' : 'strength'
  return {
    group: GROUP[id[0]],
    id,
    name: id,
    cls,
    measure: cls === 'stretch' ? 'seconds' : 'reps',
    target: cls === 'stretch' ? [30, 30] : [6, 12],
    regions: [] as Region[],
    ...SPECIAL[id],
  } as ExerciseInfo
}

// ---- tiny history builder

let n = 0
function base(today = '2026-10-08'): EngineInput {
  return { today, sessions: [], sets: [], steps: {}, days: [], catalogue }
}
function addSession(input: EngineInput, day: string, type: SessionType, sets: [string, number, number?, number?][] = []): DoneSession {
  const s: DoneSession = { id: `s${++n}`, day_type: type, started_at: `${day}T07:00:00`, ended_at: `${day}T07:20:00`, deleted: false }
  input.sessions.push(s)
  sets.forEach(([exercise_id, amount, rir = 2, pain = 0], i) => {
    const set: DoneSet = { session_id: s.id, exercise_id, set_index: i, reps: amount, seconds: null, rir, pain, deleted: false }
    input.sets.push(set)
  })
  return s
}
const day = (input: EngineInput, d: Partial<DayLog> & { day: string }) => input.days.push({ cycling: null, morning: null, ...d })

describe('rotation (R1)', () => {
  it('follows A, B, C, D, A, B, C and continues after missed days', () => {
    expect(dueType([]).due).toBe('A')
    expect(dueType(['A', 'B', 'C']).due).toBe('D')
    expect(dueType(['A', 'B', 'C', 'D', 'A', 'B', 'C']).due).toBe('A')

    const input = base('2026-10-20')
    addSession(input, '2026-10-01', 'A')
    addSession(input, '2026-10-02', 'B') // then ten days off
    expect(plan(input).type).toBe('C')
  })

  it('moves the legs session away from a hard ride and brings it back the next day', () => {
    const input = base('2026-10-02')
    addSession(input, '2026-10-01', 'A')
    day(input, { day: '2026-10-02', cycling: 'hard' })
    const today = plan(input)
    expect(today.type).toBe('C')
    expect(today.reasons.join(' ')).toMatch(/Hard ride/)

    addSession(input, '2026-10-02', 'C')
    input.today = '2026-10-03'
    expect(plan(input).type).toBe('B') // owed
    addSession(input, '2026-10-03', 'B')
    input.today = '2026-10-04'
    expect(plan(input).type).toBe('D')
  })

  it('keeps legs on an easy ride day', () => {
    const input = base('2026-10-02')
    addSession(input, '2026-10-01', 'A')
    day(input, { day: '2026-10-02', cycling: 'easy' })
    expect(plan(input).type).toBe('B')
  })

  it('respects a manual choice', () => {
    expect(plan(base(), 'D').type).toBe('D')
  })
})

describe('session content', () => {
  it('starts a returning trainee on knee push-ups with 2 sets at 3 reps in reserve (R5, R10)', () => {
    const p = plan(base())
    const push = p.items.find((i) => i.ladderId === 'push')!
    expect(push.exerciseId).toBe('P3')
    expect(push.sets).toBe(2)
    expect(push.rir).toBe(3)
    expect(push.notes.join(' ')).toMatch(/Warm-up set first/)
    expect(p.items.filter((i) => i.phase === 'warmup').map((i) => i.exerciseId)).toEqual(TEMPLATES.A.warmup)
    expect(p.items.filter((i) => i.phase === 'cooldown')).toHaveLength(TEMPLATES.A.cooldown.length)
  })

  it('uses full sets and joint-safe effort from week 3', () => {
    const input = base('2026-10-15')
    addSession(input, '2026-10-01', 'D')
    const push = plan(input, 'A').items.find((i) => i.ladderId === 'push')!
    expect(programmeWeek(input)).toBe(3)
    expect(push.sets).toBe(3)
    expect(push.rir).toBe(2)
  })

  it('halves sets in week 6 (R8)', () => {
    const input = base('2026-11-06')
    addSession(input, '2026-10-01', 'D')
    const p = plan(input, 'A')
    expect(p.week).toBe(6)
    expect(p.deload).toBe(true)
    const push = p.items.find((i) => i.ladderId === 'push')!
    expect(push.sets).toBe(2)
    expect(push.rir).toBe(4)
  })

  it('fits each session type into about 15 minutes at full volume', async () => {
    const { exerciseById } = await import('../exercises/library')
    const input = { ...base('2026-10-22'), catalogue: exerciseById } // week 3: full sets
    addSession(input, '2026-10-01', 'D')
    for (const t of ['A', 'B', 'C', 'D'] as const) {
      for (const k of [0, 1]) {
        // Both variants of the rotating slots.
        const i = { ...input, sessions: [...input.sessions] }
        for (let n = 0; n < k; n++) i.sessions.push({ id: `x${t}${n}`, day_type: t, started_at: '2026-10-02T07:00:00', ended_at: '2026-10-02T07:15:00', deleted: false })
        const p = plan(i, t)
        expect(p.minutes, `${t} variant ${k}`).toBeGreaterThanOrEqual(10)
        expect(p.minutes, `${t} variant ${k}`).toBeLessThanOrEqual(16)
      }
    }
  })

  it('keeps warm-up to one drill and the cool-down to one optional stretch', () => {
    const p = plan(base(), 'B')
    expect(p.items.filter((i) => i.phase === 'warmup')).toHaveLength(1)
    const cool = p.items.filter((i) => i.phase === 'cooldown')
    expect(cool).toHaveLength(1)
    expect(cool[0].sets).toBe(1)
    expect(cool[0].notes.join(' ')).toMatch(/Optional/)
  })

  it('alternates plank and dead bug in push sessions', () => {
    const input = base('2026-10-05')
    expect(plan(input, 'A').items.some((i) => i.ladderId === 'plank')).toBe(true)
    addSession(input, '2026-10-01', 'A')
    expect(plan(input, 'A').items.some((i) => i.ladderId === 'deadbug')).toBe(true)
  })

  it('does not offer overhead prone Y before week 2', () => {
    const input = base()
    input.steps.prone = 2 // S3
    expect(plan(input, 'C').items.find((i) => i.ladderId === 'prone')!.exerciseId).toBe('S2')
  })

  it('suggests one more rep than last time, within the range', () => {
    const input = base('2026-10-03')
    addSession(input, '2026-10-01', 'A', [['P3', 7], ['P3', 6]])
    expect(plan(input, 'A').items.find((i) => i.ladderId === 'push')!.suggested).toBe(8)
  })
})

describe('progression and pain (R6, R7)', () => {
  it('moves up a step when every set reaches the top with 2+ in reserve', () => {
    const input = base('2026-10-20')
    const s = addSession(input, '2026-10-20', 'A', [['P3', 12, 2], ['P3', 12, 3]])
    expect(evaluate(input, s.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 1, to: 2 })])
  })

  it('holds when a set misses the top or effort was too high', () => {
    const input = base()
    const s = addSession(input, '2026-10-08', 'A', [['P3', 12, 2], ['P3', 12, 1]])
    expect(evaluate(input, s.id)).toEqual([])
  })

  it('holds at pain 3/10 and steps down at 4/10 or more', () => {
    const input = base()
    const held = addSession(input, '2026-10-08', 'A', [['P3', 12, 2, 3], ['P3', 12, 2, 0]])
    expect(evaluate(input, held.id)).toEqual([])
    const hurt = addSession(input, '2026-10-08', 'A', [['P3', 8, 2, 5]])
    expect(evaluate(input, hurt.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 1, to: 0 })])
  })

  it('steps down after two sessions below the range without pain', () => {
    const input = base()
    addSession(input, '2026-10-06', 'A', [['P3', 4]])
    const s = addSession(input, '2026-10-08', 'A', [['P3', 5]])
    expect(evaluate(input, s.id)).toEqual([expect.objectContaining({ to: 0 })])
  })

  it('waits for the minimum week before stepping up', () => {
    const input = base()
    input.steps.prone = 1
    const s = addSession(input, '2026-10-08', 'C', [['S2', 20, 3], ['S2', 20, 3]]) // next step S3 needs week 2
    expect(evaluate(input, s.id)).toEqual([])
  })

  it('asks for a morning check after a session that loaded a problem joint', () => {
    const input = base('2026-10-09')
    const s = addSession(input, '2026-10-08', 'A', [['P3', 8]])
    expect(morningCheckDue(input)).toEqual({ session: s, regions: ['shoulder', 'wrist', 'knee'] })
    day(input, { day: '2026-10-09', morning: { shoulder: 'same', wrist: 'same', knee: 'same' } })
    expect(morningCheckDue(input)).toBeNull()
  })

  it('steps down and reduces sets when a joint is worse the next morning', () => {
    const input = base('2026-10-09')
    input.steps.push = 2
    const s = addSession(input, '2026-10-08', 'A', [['P4', 8]])
    expect(morningUpdates(input, s.id, { wrist: 'worse' })).toEqual([expect.objectContaining({ ladderId: 'push', from: 2, to: 1 })])

    day(input, { day: '2026-10-09', morning: { wrist: 'worse' } })
    input.today = '2026-10-23' // week 3, full sets
    const push = plan(input, 'A').items.find((i) => i.ladderId === 'push')!
    expect(push.sets).toBe(2) // 3 × 2/3
    expect(push.notes.join(' ')).toMatch(/Fewer sets/)
  })

  it('pauses a pattern after two flare-ups in a row and advises a review', () => {
    const input = base('2026-10-11')
    addSession(input, '2026-10-06', 'A', [['P3', 8]])
    day(input, { day: '2026-10-07', morning: { shoulder: 'worse' } })
    addSession(input, '2026-10-09', 'A', [['P3', 8]])
    day(input, { day: '2026-10-10', morning: { shoulder: 'worse' } })
    const p = plan(input, 'A')
    expect(p.items.some((i) => i.ladderId === 'push')).toBe(false)
    expect(p.warnings.join(' ')).toMatch(/physiotherapist/)
  })
})

describe('one-off steps ("just today")', () => {
  it('does not move the ladder after a harder step tried once', () => {
    const input = base('2026-10-20')
    const s = addSession(input, '2026-10-20', 'A', [['P5', 12, 3], ['P5', 12, 3]]) // current step is P3
    expect(evaluate(input, s.id)).toEqual([])
  })

  it('only applies the pain rule to an easier step used once', () => {
    const input = base('2026-10-20')
    input.steps.push = 3 // P5
    const easy = addSession(input, '2026-10-20', 'A', [['P3', 12, 3], ['P3', 12, 3]])
    expect(evaluate(input, easy.id)).toEqual([])
    const hurt = addSession(input, '2026-10-20', 'A', [['P3', 8, 2, 5]])
    expect(evaluate(input, hurt.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 3, to: 0 })])
  })
})

describe('extra exercises after a session', () => {
  it('offers the other ladder of a rotating slot first, then another muscle group', () => {
    const input = base('2026-10-20') // week 3, a Tuesday
    const p = plan(input, 'A')
    const extras = extraOptions(input, 'A', p.items)
    expect(extras).toHaveLength(2)
    expect(extras[0].ladderId).toBe('deadbug') // plank was used in this slot
    expect(extras.every((e) => e.sets === 2 && e.phase === 'main')).toBe(true)
    expect(extras.map((e) => e.ladderId)).not.toContain('push')
  })

  it('leaves out groups that would pass 12 sets this week, and legs on a hard ride day', () => {
    const input = base('2026-10-21') // Wednesday
    addSession(input, '2026-10-19', 'B', Array.from({ length: 11 }, () => ['K3', 10] as [string, number]))
    expect(weeklySetsByGroup(input).get('legs')).toBe(11)
    const ids = (type: SessionType) => extraOptions(input, type, plan(input, type).items, 20).map((e) => e.ladderId)
    expect(ids('A')).not.toContain('knee')
    expect(ids('A')).toContain('bridge')
    day(input, { day: '2026-10-21', cycling: 'hard' })
    expect(ids('A')).not.toContain('bridge')
  })

  it('offers nothing in a deload week', () => {
    const input = base('2026-11-05')
    addSession(input, '2026-10-01', 'A', [['P3', 8]]) // week 1 starts 1 Oct; 5 Nov is week 6
    expect(extraOptions(input, 'A', plan(input, 'A').items)).toEqual([])
  })
})

describe('stretch top-up (R9)', () => {
  it('targets hip flexors, hamstrings and calves after a ride', () => {
    const p = stretchPlan(base(), true)
    expect(p.items.map((i) => i.exerciseId)).toEqual(['M1', 'M2', 'M4'])
    expect(p.items.every((i) => i.sets === 1 && i.phase === 'cooldown')).toBe(true)
    expect(p.minutes).toBeLessThanOrEqual(5)
  })

  it('rotates three stretches and skips the one already done today', () => {
    const input = base('2026-10-20')
    addSession(input, '2026-10-20', 'A')
    const ids = stretchPlan(input, false).items.map((i) => i.exerciseId)
    expect(ids).toHaveLength(3)
    expect(ids).not.toContain('M8') // session A's cool-down
    expect(stretchPlan(base('2026-10-21'), false).items.map((i) => i.exerciseId)).not.toEqual(stretchPlan(base('2026-10-20'), false).items.map((i) => i.exerciseId))
  })

  it('does not count as a programme session', () => {
    const input = base('2026-10-20')
    input.sessions.push({ id: 'st', day_type: 'S', started_at: '2026-10-20T08:00:00', ended_at: '2026-10-20T08:04:00', deleted: false })
    expect(plan(input).type).toBe('A')
    expect(programmeWeek(input)).toBe(1)
  })
})
