import { useEffect, useId, useRef, useState } from 'react'
import { BODY, GROUND_Y, sample, solve, type Animation, type Figure } from './skeleton'
import { arm, leg, neck, torso, WIDTH } from './shapes'

export const DEFAULT_VIEWBOX = [15, 22, 130, 92] as const

const f2 = (n: number) => n.toFixed(2)

/** The figure's body shapes; `far` and `near` select which side is drawn. */
function Body({ f, part }: { f: Figure; part: 'far' | 'near' | 'all' }) {
  const far = part !== 'near'
  const near = part !== 'far'
  // A thin ring in the stage colour keeps overlapping parts readable.
  const ring = { stroke: 'var(--stage)', strokeWidth: 1.1, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const }
  return (
    <>
      {far && leg(f.legFar).map((d, i) => <path key={`lf${i}`} d={d} {...ring} />)}
      {far && arm(f.armFar).map((d, i) => <path key={`af${i}`} d={d} {...ring} />)}
      {far && <circle cx={f.armFar.end[0]} cy={f.armFar.end[1]} r={WIDTH.hand / 2} />}
      {near && <path d={neck(f)} />}
      {near && <path d={torso(f)} {...ring} />}
      {near && leg(f.legNear).map((d, i) => <path key={`ln${i}`} d={d} {...ring} />)}
      {near && arm(f.armNear).map((d, i) => <path key={`an${i}`} d={d} {...ring} />)}
      {near && <circle cx={f.armNear.end[0]} cy={f.armNear.end[1]} r={WIDTH.hand / 2} />}
    </>
  )
}

/** Top view: soft shadows under the parts lifted off the mat. */
function Shadows({ f, lift }: { f: Figure; lift: { arms?: number; legs?: number; chest?: number } }) {
  const off = (k: number) => `translate(${f2(3.4 * k)} ${f2(4.8 * k)})`
  return (
    <g className="fill-[var(--shadow)]">
      {!!lift.arms && (
        <g transform={off(lift.arms)}>
          {[...arm(f.armFar), ...arm(f.armNear)].map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
      {!!lift.legs && (
        <g transform={off(lift.legs)}>
          {[...leg(f.legFar), ...leg(f.legNear)].map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
      {!!lift.chest && (
        <g transform={off(lift.chest)}>
          <path d={torso(f)} />
          <circle cx={f.headCenter[0]} cy={f.headCenter[1]} r={BODY.headR} />
        </g>
      )}
    </g>
  )
}

/** Side view: a soft contact shadow under whatever touches the floor. */
function FloorShadow({ f, id }: { f: Figure; id: string }) {
  const pts = [f.hip, f.shoulder, f.headCenter, f.legNear.mid, f.legNear.end, f.legNear.toe, f.legFar.mid, f.legFar.end, f.legFar.toe, f.armNear.end, f.armFar.end, f.armNear.mid, f.armFar.mid]
  const low = pts.filter((p) => p[1] > GROUND_Y - 14)
  if (!low.length) return null
  const x0 = Math.min(...low.map((p) => p[0])) - 6
  const x1 = Math.max(...low.map((p) => p[0])) + 6
  return <ellipse cx={(x0 + x1) / 2} cy={GROUND_Y - 0.5} rx={(x1 - x0) / 2} ry={2.6} fill={`url(#${id})`} />
}

/**
 * Exercise animation. Plays continuously, or shows the single moment `time`
 * (in seconds) when given.
 */
export function FigureView({
  animation,
  playing = true,
  showLabel = true,
  time,
}: {
  animation: Animation
  playing?: boolean
  showLabel?: boolean
  time?: number
}) {
  const uid = useId().replace(/:/g, '')
  const [t, setT] = useState(0)
  const start = useRef<number | null>(null)
  const animate = playing && time === undefined

  useEffect(() => {
    if (!animate) return
    let frame = 0
    const tick = (now: number) => {
      if (start.current === null) start.current = now - t * 1000
      setT((now - start.current) / 1000)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      start.current = null
    }
    // Resumes from the current time; `t` is deliberately not a dependency.
  }, [animate, animation])

  const { pose, label } = sample(animation, time ?? t)
  const f = solve(pose)
  const [vx, vy, vw, vh] = animation.viewBox ?? DEFAULT_VIEWBOX
  const top = animation.view === 'top'
  const shadowId = `floor-shadow-${uid}`

  return (
    <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block h-auto w-full" role="img" aria-label={label ?? 'Exercise animation'}>
      <defs>
        <radialGradient id={shadowId}>
          <stop offset="0%" stopColor="var(--shadow)" />
          <stop offset="100%" stopColor="var(--shadow)" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={vx} y={vy} width={vw} height={vh} className="fill-[var(--stage)]" />
      {top ? (
        <rect x={vx + 5} y={vy + 5} width={vw - 10} height={vh - 10} rx={5} className="fill-[var(--mat-top)]" />
      ) : (
        <>
          <rect x={vx} y={GROUND_Y} width={vw} height={Math.max(0, vy + vh - GROUND_Y)} className="fill-[var(--floor)]" />
          <rect x={vx + 8} y={GROUND_Y - 1} width={vw - 16} height={1.4} rx={0.7} className="fill-[var(--mat)]" />
          <FloorShadow f={f} id={shadowId} />
        </>
      )}
      {animation.wall && <rect x={animation.wall.x - 6} y={vy} width={6} height={GROUND_Y - vy} rx={1} className="fill-[var(--floor)]" />}

      {top && pose.lift && <Shadows f={f} lift={pose.lift} />}

      {top ? (
        <g className="fill-[var(--figure)]">
          <Body f={f} part="all" />
        </g>
      ) : (
        <>
          <g className="fill-[var(--figure-far)]">
            <Body f={f} part="far" />
          </g>
          <g className="fill-[var(--figure)]">
            <Body f={f} part="near" />
          </g>
        </>
      )}
      <circle cx={f.headCenter[0]} cy={f.headCenter[1]} r={BODY.headR} className="fill-[var(--figure)]" stroke="var(--stage)" strokeWidth={1.1} paintOrder="stroke" />

      {showLabel && label && (
        <text x={vx + vw - 5} y={vy + 9} textAnchor="end" className="fill-[var(--muted)] text-[5.5px] font-semibold tracking-wider uppercase">
          {label}
        </text>
      )}
    </svg>
  )
}
