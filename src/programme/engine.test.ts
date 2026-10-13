import { describe, expect, it } from 'vitest'
import type { ExerciseClass, Group, Region } from '../exercises/types'
import { dueType, evaluate, extraOptions, morningCheckDue, morningUpdates, plan, programmeWeek, stepOf, stretchPlan, testId, weeklySetsByGroup, type DayLog, type DoneSession, type DoneSet, type EngineInput, type ExerciseInfo } from './engine'
import { LADDERS, TEMPLATES, type SessionType } from './ladders'
import { buildTimeline, totalSeconds } from './timeline'

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
  ...Object.values(TEMPLATES).flatMap((t) => [...t.ramp, ...t.build, ...t.peak, ...t.winddown].flatMap((s) => ('exercise' in s ? [s.exercise, s.hardRide ?? s.exercise] : 'ladder' in s && s.fallback ? [s.fallback] : []))),
])
const GROUP: Record<string, Group> = { P: 'push', C: 'core', K: 'legs', F: 'legs', H: 'hips', A: 'hips', S: 'back', E: 'back', M: 'mobility', W: 'warmup', X: 'core', Y: 'cardio' }
const catalogue = (id: string): ExerciseInfo | undefined => {
  if (!allIds.has(id)) return undefined
  const cls: ExerciseClass = id.startsWith('M') ? 'stretch' : id.startsWith('W') ? 'drill' : id.startsWith('Y') ? 'flow' : 'strength'
  return {
    group: GROUP[id[0]],
    id,
    name: id,
    cls,
    components: cls === 'flow' ? ['pulse', 'strength'] : undefined,
    measure: cls === 'stretch' || cls === 'flow' ? 'seconds' : 'reps',
    target: cls === 'stretch' ? [30, 30] : cls === 'flow' ? [30, 45] : [6, 12],
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

const rated = (id: string, rir: number, n = 2, pain = 0): [string, number, number, number][] => Array.from({ length: n }, () => [id, 40, rir, pain])

describe('timed session content (R14, R15)', () => {
  it('starts a returning trainee with 30/30 intervals and knee push-ups (R5, R10, R15)', () => {
    const p = plan(base())
    const push = p.items.find((i) => i.ladderId === 'push')!
    expect(push).toMatchObject({ exerciseId: 'P3', block: 'build', work: 30, rest: 30, rounds: 2, rir: 3 })
    expect(p.items.filter((i) => i.block === 'ramp').map((i) => i.exerciseId)).toEqual(['Y24', 'Y4', 'Y18', 'P1'])
    expect(p.items.filter((i) => i.block === 'winddown').map((i) => i.exerciseId)).toEqual(['M8', 'M6'])
    expect(p.items.filter((i) => i.block === 'peak').every((i) => i.rounds === 1)).toBe(true)
    expect(p.items.filter((i) => i.block === 'ramp' || i.block === 'winddown').every((i) => !i.ladderId)).toBe(true)
  })

  it('uses 40/20 with two Peak rounds from week 3', () => {
    const input = base('2026-10-15')
    addSession(input, '2026-10-01', 'D')
    const p = plan(input, 'A')
    expect(p.items.find((i) => i.ladderId === 'push')).toMatchObject({ work: 40, rest: 20, rounds: 2, rir: 2 })
    expect(p.items.filter((i) => i.block === 'peak').every((i) => i.work === 40 && i.rounds === 2)).toBe(true)
  })

  it('uses one round each and adds stretching in a deload week (R8)', () => {
    const input = base('2026-11-06')
    addSession(input, '2026-10-01', 'D')
    const p = plan(input, 'A')
    expect(p.deload).toBe(true)
    expect(p.items.find((i) => i.ladderId === 'push')).toMatchObject({ rounds: 1, rir: 4, work: 30 })
    expect(p.items.filter((i) => i.block === 'winddown').length).toBeGreaterThan(TEMPLATES.A.winddown.length)
  })

  it('moves Peak to 45/15 from week 8 unless Peak felt too hard twice in the last week', () => {
    const input = base('2026-11-20')
    addSession(input, '2026-09-25', 'D') // week 9
    expect(plan(input, 'A').items.filter((i) => i.block === 'peak').every((i) => i.work === 45 && i.rest === 15)).toBe(true)
    addSession(input, '2026-11-17', 'A', rated('Y18', 0))
    addSession(input, '2026-11-19', 'C', rated('Y1', 0))
    expect(plan(input, 'A').items.find((i) => i.block === 'peak')!.work).toBe(40)
  })

  it('orders intervals as ramp, build circuit, peak circuit, wind-down', () => {
    const input = base('2026-10-15')
    addSession(input, '2026-10-01', 'D')
    const p = plan(input, 'A')
    const blocks = p.intervals!.map((iv) => p.items[iv.item].block)
    const order = ['ramp', 'build', 'peak', 'winddown']
    expect(blocks.every((b, i) => i === 0 || order.indexOf(b!) >= order.indexOf(blocks[i - 1]!))).toBe(true)
    const build = p.intervals!.filter((iv) => p.items[iv.item].block === 'build').map((iv) => `${p.items[iv.item].ladderId}${iv.round}`)
    expect(build).toEqual(['push1', 'plank1', 'push2', 'plank2'])
  })

  it('fits each session type into 13–16 minutes at full volume', async () => {
    const { exerciseById } = await import('../exercises/library')
    const input = { ...base('2026-10-22'), catalogue: exerciseById } // week 4
    addSession(input, '2026-10-01', 'D')
    for (const t of ['A', 'B', 'C', 'D'] as const) {
      for (const k of [0, 1]) {
        // Both variants of the rotating slots.
        const i = { ...input, sessions: [...input.sessions] }
        for (let n = 0; n < k; n++) i.sessions.push({ id: `x${t}${n}`, day_type: t, started_at: '2026-10-02T07:00:00', ended_at: '2026-10-02T07:15:00', deleted: false })
        const p = plan(i, t)
        const seconds = totalSeconds(buildTimeline(p.intervals!))
        expect(seconds / 60, `${t} variant ${k}`).toBeGreaterThanOrEqual(12)
        expect(seconds / 60, `${t} variant ${k}`).toBeLessThanOrEqual(16.5)
      }
    }
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

  it('keeps legs out of Peak on a hard ride day (R1)', () => {
    const input = base('2026-10-15')
    addSession(input, '2026-10-01', 'D')
    day(input, { day: '2026-10-15', cycling: 'hard' })
    const peak = plan(input, 'C').items.filter((i) => i.block === 'peak')
    expect(peak.some((i) => i.ladderId === 'ylateral')).toBe(false)
    expect(peak.some((i) => i.exerciseId === 'Y18')).toBe(true)
  })

  it('uses the hinge flow when the squat flow needs a further knee step', () => {
    const input = base('2026-10-15') // knee ladder at its start (K1); the squat flow needs K3
    addSession(input, '2026-10-01', 'D')
    const ids = plan(input, 'B').items.map((i) => i.ladderId)
    expect(ids).not.toContain('ysquat')
    expect(ids).toContain('yhinge')
  })

  it('notes the last rating as a lever within the step (R16)', () => {
    const input = base('2026-10-20')
    addSession(input, '2026-10-01', 'D')
    addSession(input, '2026-10-17', 'A', rated('P3', 4))
    expect(plan(input, 'A').items.find((i) => i.ladderId === 'push')!.notes.join(' ')).toMatch(/too easy/)
  })
})

describe('progression by rating and pain (R16, R7)', () => {
  const week3 = () => {
    const input = base('2026-10-20')
    addSession(input, '2026-10-01', 'D')
    return input
  }

  it('moves up a step after two sessions rated too easy', () => {
    const input = week3()
    addSession(input, '2026-10-17', 'A', rated('P3', 4))
    const s = addSession(input, '2026-10-20', 'A', rated('P3', 4))
    expect(evaluate(input, s.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 1, to: 2 })])
  })

  it('holds after one too-easy session or when it felt about right', () => {
    const input = week3()
    addSession(input, '2026-10-17', 'A', rated('P3', 2))
    const s = addSession(input, '2026-10-20', 'A', rated('P3', 4))
    expect(evaluate(input, s.id)).toEqual([])
  })

  it('makes no step changes up in weeks 1–2', () => {
    const input = base('2026-10-08')
    addSession(input, '2026-10-05', 'A', rated('P3', 4))
    const s = addSession(input, '2026-10-08', 'A', rated('P3', 4))
    expect(evaluate(input, s.id)).toEqual([])
  })

  it('holds at pain 3/10 and steps down at 4/10 or more', () => {
    const input = base()
    const held = addSession(input, '2026-10-08', 'A', rated('P3', 2, 2, 3))
    expect(evaluate(input, held.id)).toEqual([])
    const hurt = addSession(input, '2026-10-08', 'A', rated('P3', 2, 1, 5))
    expect(evaluate(input, hurt.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 1, to: 0 })])
  })

  it('steps down after two sessions rated too hard', () => {
    const input = week3()
    addSession(input, '2026-10-17', 'A', rated('P3', 0))
    const s = addSession(input, '2026-10-20', 'A', rated('P3', 0))
    expect(evaluate(input, s.id)).toEqual([expect.objectContaining({ to: 0 })])
  })

  it('steps down at once when the first try on a step is too hard in weeks 1–2 (calibration)', () => {
    const input = base('2026-10-08')
    const s = addSession(input, '2026-10-08', 'A', rated('P3', 0))
    expect(evaluate(input, s.id)).toEqual([expect.objectContaining({ to: 0 })])
  })

  it('keeps a Y step until its own conditions hold', () => {
    const input = week3()
    input.steps.ysquat = 1 // Y8; Y9 needs the knee ladder at K4
    input.steps.knee = 2 // K3
    addSession(input, '2026-10-17', 'B', rated('Y8', 4))
    const s = addSession(input, '2026-10-20', 'B', rated('Y8', 4))
    expect(evaluate(input, s.id)).toEqual([])
    input.steps.knee = 4 // K4
    expect(evaluate(input, s.id)).toEqual([expect.objectContaining({ ladderId: 'ysquat', to: 2 })])
  })

  it('counts an interval rated too easy as half a set, and pulse-only moves not at all', () => {
    const input = base('2026-10-21')
    addSession(input, '2026-10-19', 'A', [...rated('P3', 4), ...rated('P1', 2)])
    expect(weeklySetsByGroup(input).get('push')).toBe(3)
  })

  it('asks for a morning check after a session that loaded a problem joint', () => {
    const input = base('2026-10-09')
    const s = addSession(input, '2026-10-08', 'A', [['P3', 40]])
    expect(morningCheckDue(input)).toEqual({ session: s, regions: ['shoulder', 'wrist', 'knee'] })
    day(input, { day: '2026-10-09', morning: { shoulder: 'same', wrist: 'same', knee: 'same' } })
    expect(morningCheckDue(input)).toBeNull()
  })

  it('steps down and drops a round when a joint is worse the next morning', () => {
    const input = base('2026-10-09')
    input.steps.push = 2
    const s = addSession(input, '2026-10-08', 'A', [['P4', 40]])
    expect(morningUpdates(input, s.id, { wrist: 'worse' })).toEqual([expect.objectContaining({ ladderId: 'push', from: 2, to: 1 })])

    day(input, { day: '2026-10-09', morning: { wrist: 'worse' } })
    input.today = '2026-10-23' // week 3
    const push = plan(input, 'A').items.find((i) => i.ladderId === 'push')!
    expect(push.rounds).toBe(1)
    expect(push.notes.join(' ')).toMatch(/One round less/)
  })

  it('pauses a pattern after two flare-ups in a row and advises a review', () => {
    const input = base('2026-10-11')
    addSession(input, '2026-10-06', 'A', [['P3', 40]])
    day(input, { day: '2026-10-07', morning: { shoulder: 'worse' } })
    addSession(input, '2026-10-09', 'A', [['P3', 40]])
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
    addSession(input, '2026-10-01', 'D')
    addSession(input, '2026-10-17', 'A', rated('P3n', 4))
    const harder = addSession(input, '2026-10-20', 'A', rated('P3n', 4))
    expect(evaluate(input, harder.id)).toEqual([expect.objectContaining({ ladderId: 'push', from: 1, to: 2 })])
    const other = base('2026-10-20')
    addSession(other, '2026-10-01', 'D')
    addSession(other, '2026-10-17', 'A', rated('P3w', 4))
    const easier = addSession(other, '2026-10-20', 'A', rated('P3w', 4))
    expect(evaluate(other, easier.id)).toEqual([])
  })
})

describe('advanced steps (R13)', () => {
  // Push at P7 (index 4); P10 (index 5) is gated: P7 mastered, week 8+, pain-free, then a test.
  const ready = (today = '2026-11-20') => {
    const input = base(today)
    input.steps.push = 4
    addSession(input, '2026-09-25', 'B') // week 1 starts 25 Sep; 20 Nov is week 9
    for (const d of ['2026-11-14', '2026-11-17']) addSession(input, d, 'A', rated('P7', 4))
    return input
  }
  const testItem = (input: EngineInput) => plan(input, 'A').items.find((i) => i.test)

  it('does not step up into a gated step automatically', () => {
    const input = ready()
    const s = addSession(input, '2026-11-20', 'A', rated('P7', 4))
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
