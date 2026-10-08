import { useEffect, useRef, useState } from 'react'
import { BODY, GROUND_Y, sample, solve, type Animation, type Vec } from './skeleton'

const DEFAULT_VIEWBOX = [15, 22, 130, 92] as const

const path = (...pts: Vec[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')

/** Animated stick figure. Near-side limbs are solid, far-side limbs are faded. */
export function FigureView({ animation, playing = true, showLabel = true }: { animation: Animation; playing?: boolean; showLabel?: boolean }) {
  const [t, setT] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) return
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
  }, [playing, animation])

  const { pose, label } = sample(animation, t)
  const f = solve(pose)
  const [vx, vy, vw, vh] = animation.viewBox ?? DEFAULT_VIEWBOX

  return (
    <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block w-full h-auto" role="img" aria-label={label ?? 'Exercise animation'}>
      <rect x={vx} y={GROUND_Y} width={vw} height={vy + vh - GROUND_Y} className="fill-[var(--floor)]" />
      <rect x={vx + 6} y={GROUND_Y - 1.2} width={vw - 12} height={1.6} rx={0.8} className="fill-[var(--mat)]" />
      {animation.wall && <rect x={animation.wall.x - 6} y={vy} width={6} height={GROUND_Y - vy} className="fill-[var(--floor)]" />}

      <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--figure-far)]">
        <path d={path(f.armFar.base, f.armFar.mid, f.armFar.end)} strokeWidth={4.2} />
        <path d={path(f.legFar.base, f.legFar.mid, f.legFar.end, f.legFar.toe)} strokeWidth={5} />
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--figure)]">
        <path d={path(f.hip, f.shoulder)} strokeWidth={7.5} />
        <path d={path(f.legNear.base, f.legNear.mid, f.legNear.end, f.legNear.toe)} strokeWidth={5} />
        <path d={path(f.armNear.base, f.armNear.mid, f.armNear.end)} strokeWidth={4.2} />
      </g>
      <circle cx={f.headCenter[0]} cy={f.headCenter[1]} r={BODY.headR} className="fill-[var(--figure)]" />

      {showLabel && label && (
        <text x={vx + vw - 4} y={vy + 8} textAnchor="end" className="fill-[var(--muted)] text-[6px] font-medium tracking-wide uppercase">
          {label}
        </text>
      )}
    </svg>
  )
}
