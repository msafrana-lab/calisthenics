import { useEffect, useRef, useState } from 'react'
import { BODY, GROUND_Y, sample, solve, type Animation, type Figure, type Vec } from './skeleton'

export const DEFAULT_VIEWBOX = [15, 22, 130, 92] as const

const f2 = (n: number) => n.toFixed(2)
const path = (...pts: Vec[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${f2(p[0])} ${f2(p[1])}`).join(' ')
const spinePath = (f: Figure) => `M${f2(f.hip[0])} ${f2(f.hip[1])} Q${f2(f.spineControl[0])} ${f2(f.spineControl[1])} ${f2(f.shoulder[0])} ${f2(f.shoulder[1])}`

const ARM_W = 4.2
const LEG_W = 5
const TORSO_W = 7.5

/** The figure's strokes; `far` and `near` select which limbs are drawn. */
function Body({ f, part }: { f: Figure; part: 'far' | 'near' | 'all' }) {
  const far = part !== 'near'
  const near = part !== 'far'
  return (
    <>
      {far && <path d={path(f.armFar.base, f.armFar.mid, f.armFar.end)} strokeWidth={ARM_W} />}
      {far && <path d={path(f.legFar.base, f.legFar.mid, f.legFar.end, f.legFar.toe)} strokeWidth={LEG_W} />}
      {near && <path d={spinePath(f)} strokeWidth={TORSO_W} />}
      {near && <path d={path(f.legNear.base, f.legNear.mid, f.legNear.end, f.legNear.toe)} strokeWidth={LEG_W} />}
      {near && <path d={path(f.armNear.base, f.armNear.mid, f.armNear.end)} strokeWidth={ARM_W} />}
    </>
  )
}

/** Top view: soft shadows under the parts lifted off the mat. */
function Shadows({ f, lift }: { f: Figure; lift: { arms?: number; legs?: number; chest?: number } }) {
  const off = (k: number) => `translate(${f2(3.4 * k)} ${f2(4.8 * k)})`
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--shadow)]">
      {!!lift.arms && (
        <g transform={off(lift.arms)}>
          <path d={path(f.armFar.base, f.armFar.mid, f.armFar.end)} strokeWidth={ARM_W} />
          <path d={path(f.armNear.base, f.armNear.mid, f.armNear.end)} strokeWidth={ARM_W} />
        </g>
      )}
      {!!lift.legs && (
        <g transform={off(lift.legs)}>
          <path d={path(f.legFar.base, f.legFar.mid, f.legFar.end)} strokeWidth={LEG_W} />
          <path d={path(f.legNear.base, f.legNear.mid, f.legNear.end)} strokeWidth={LEG_W} />
        </g>
      )}
      {!!lift.chest && (
        <g transform={off(lift.chest)}>
          <path d={spinePath(f)} strokeWidth={TORSO_W} />
          <circle cx={f.headCenter[0]} cy={f.headCenter[1]} r={BODY.headR} className="fill-[var(--shadow)] stroke-none" />
        </g>
      )}
    </g>
  )
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

  return (
    <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block h-auto w-full" role="img" aria-label={label ?? 'Exercise animation'}>
      {top ? (
        <>
          <rect x={vx} y={vy} width={vw} height={vh} className="fill-[var(--floor)]" />
          <rect x={vx + 5} y={vy + 5} width={vw - 10} height={vh - 10} rx={4} className="fill-[var(--mat-top)]" />
        </>
      ) : (
        <>
          <rect x={vx} y={GROUND_Y} width={vw} height={Math.max(0, vy + vh - GROUND_Y)} className="fill-[var(--floor)]" />
          <rect x={vx + 6} y={GROUND_Y - 1.2} width={vw - 12} height={1.6} rx={0.8} className="fill-[var(--mat)]" />
        </>
      )}
      {animation.wall && <rect x={animation.wall.x - 6} y={vy} width={6} height={GROUND_Y - vy} className="fill-[var(--floor)]" />}

      {top && pose.lift && <Shadows f={f} lift={pose.lift} />}

      {top ? (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--figure)]">
          <Body f={f} part="all" />
        </g>
      ) : (
        <>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--figure-far)]">
            <Body f={f} part="far" />
          </g>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--figure)]">
            <Body f={f} part="near" />
          </g>
        </>
      )}
      <circle cx={f.headCenter[0]} cy={f.headCenter[1]} r={BODY.headR} className="fill-[var(--figure)]" />

      {showLabel && label && (
        <text x={vx + vw - 4} y={vy + 8} textAnchor="end" className="fill-[var(--muted)] text-[6px] font-medium tracking-wide uppercase">
          {label}
        </text>
      )}
    </svg>
  )
}
