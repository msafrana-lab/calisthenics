import { describe, expect, it } from 'vitest'
import type { ExerciseClass, Group, Region } from '../exercises/types'
import { dueType, evaluate, extraOptions, morningCheckDue, morningUpdates, plan, programmeWeek, stepOf, stretchPlan, testId, weeklySetsByGroup, type DayLog, type DoneSession, type DoneSet, type EngineInput, type ExerciseInfo } from './engine'
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
  P3n: { variationOf: 'P3', difficulty: 'harder', regions: ['shoulder', 'wrist', 'knee'] },
  P3w: { variationOf: 'P3', difficulty: 'easier', regions: ['shoulder', 'wrist', 'knee'] },
  P7: { regions: ['shoulder', 'wrist'] },
  P10: { regions: ['shoulder', 'wrist'] },
}
const allIds = new Set([
  ...Object.values(LADDERS).flatMap((l) => l.steps.map((s) => s.id)),
  'P3n', // the only variations in this catalogue, so other ladders keep their standard version
  'P3w',
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

describe('variations (R12)', () => {
  const history = (input: EngineInput, n: number, id = 'P3') => {
    for (let i = 0; i < n; i++) addSession(input, `2026-10-${String(1 + i * 2).padStart(2, '0')}`, 'A', [[id, 8]])
  }
  const pushItem = (input: EngineInput) => plan(input, 'A').items.find((i) => i.ladderId === 'push' && !i.test)!

  it('maps a variation to its step', () => {
    expect(stepOf('P3n')).toBe('P3')
    expect(stepOf('P3')).toBe('P3')
  })

  it('uses the standard version first, then alternates it with the variations', () => {
    const versions = [0, 1, 2, 3, 4, 5].map((n) => {
      const input = base('2026-10-26') // week 4
      history(input, n)
      if (!n) addSession(input, '2026-10-01', 'B')
      return pushItem(input).exerciseId
    })
    expect(versions).toEqual(['P3', 'P3', 'P3', 'P3n', 'P3', 'P3w'])
  })

  it('keeps the standard version in re-entry weeks, deload weeks and after pain', () => {
    const early = base('2026-10-10')
    history(early, 3)
    expect(pushItem(early).exerciseId).toBe('P3')

    const hurt = base('2026-10-26')
    history(hurt, 2)
    addSession(hurt, '2026-10-24', 'A', [['P3', 8, 2, 3]])
    expect(pushItem(hurt).exerciseId).toBe('P3')
  })

  it('counts harder variations towards a step up, but not easier ones', () => {
    const input = base('2026-10-20')
    const harder = addSession(input, '2026-10-20', 'A', [['P3n', 12, 2], ['P3n', 12, 2]])
    expect(evaluate(input, harder.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 1, to: 2 })])
    const easier = addSession(input, '2026-10-20', 'A', [['P3w', 12, 2], ['P3w', 12, 2]])
    expect(evaluate(input, easier.id)).toEqual([])
  })
})

describe('advanced steps (R13)', () => {
  // Push at P7 (index 4); P10 (index 5) is gated: P7 mastered, week 8+, pain-free, then a test.
  const ready = (today = '2026-11-20') => {
    const input = base(today)
    input.steps.push = 4
    addSession(input, '2026-09-25', 'B') // week 1 starts 25 Sep; 20 Nov is week 9
    for (const d of ['2026-11-14', '2026-11-17']) addSession(input, d, 'A', [['P7', 12, 2], ['P7', 12, 3]])
    return input
  }
  const testItem = (input: EngineInput) => plan(input, 'A').items.find((i) => i.test)

  it('does not step up into a gated step automatically', () => {
    const input = ready()
    const s = addSession(input, '2026-11-20', 'A', [['P7', 12, 2], ['P7', 12, 2]])
    expect(evaluate(input, s.id)).toEqual([])
  })

  it('offers the readiness test once mastery, pain history and timing hold', () => {
    expect(testItem(ready())).toMatchObject({ exerciseId: 'P10', sets: 1, test: { stepId: 'P10' } })
    const early = ready()
    early.sessions.find((x) => x.day_type === 'B')!.started_at = '2026-10-05T07:00:00' // 20 Nov is then week 7
    expect(testItem(early)).toBeUndefined()
  })

  it('withholds the test after recent joint pain or a worse morning', () => {
    const pain = ready()
    addSession(pain, '2026-11-18', 'B', [['P3', 8, 2, 3]])
    expect(testItem(pain)).toBeUndefined()
    const morning = ready()
    day(morning, { day: '2026-11-18', morning: { wrist: 'worse' } })
    expect(testItem(morning)).toBeUndefined()
  })

  it('unlocks the step when the test is passed, and waits 7 days after a failed one', () => {
    const input = ready()
    const passed = addSession(input, '2026-11-20', 'A', [[testId('P10'), 1, 2, 0]])
    expect(evaluate(input, passed.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 4, to: 5 })])

    const failed = ready()
    const f = addSession(failed, '2026-11-20', 'A', [[testId('P10'), 0, 2, 0]])
    expect(evaluate(failed, f.id)).toEqual([])
    failed.today = '2026-11-24'
    expect(testItem(failed)).toBeUndefined()
    failed.today = '2026-11-27'
    expect(testItem(failed)).toBeDefined()
  })

  it('keeps the crawl ladder closed until its first step is unlocked', () => {
    const slotLadders = (input: EngineInput) => new Set([0, 1, 2, 3, 4, 5].map((k) => {
      const i = base('2026-10-20')
      Object.assign(i.steps, input.steps)
      for (let j = 0; j < k; j++) addSession(i, '2026-10-01', 'A')
      return plan(i, 'A').items.find((x) => ['plank', 'deadbug', 'crawl'].includes(x.ladderId ?? ''))!.ladderId
    }))
    expect(slotLadders(base())).toEqual(new Set(['plank', 'deadbug']))
    const open = base()
    open.steps.crawl = 0
    expect(slotLadders(open)).toEqual(new Set(['plank', 'deadbug', 'crawl']))
  })
})
