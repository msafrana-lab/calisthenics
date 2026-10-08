# Exercise Animation Authoring Guide

Each exercise is animated by a code-drawn 2D stick figure. This guide explains how to write one.

## Model

Defined in `src/animation/skeleton.ts`.

- **Body segments** (units): torso 30, neck 4, head radius 6.5, upper arm 16, forearm 15, thigh 25, shin 24, foot 7.
- **Coordinates**: SVG, x to the right, **y downwards**. In side view the floor surface is `GROUND_Y = 110`.
- **Angles** are absolute directions in degrees: `0` = pointing down, `90` = pointing right, `180` = up, `270` = left. `dir(angle)` gives the unit vector; `angleTo(a, b)` gives the angle from point a to point b.
- **A pose** (`Pose`) fixes:
  - `hip`: hip position.
  - `torso`: direction from hip to shoulder.
  - `head`: direction from shoulder to head.
  - Four limbs: `armNear`, `armFar`, `legNear`, `legFar`.
  - Optional:
    - `footNear` / `footFar`: foot direction; the default is perpendicular to the shin.
    - `spine`: back curvature. Positive rounds the back (flexion, cat), negative arches it (extension, cow). Values of about ±4 are visible.
    - `lift`: top view only.
- **A limb** is either free or pinned:
  - **Free**: `{ a: [upperAngle, lowerAngle] }`.
  - **Pinned**: `{ pin: [x, y], bend: 1 | -1 }`. The end of the limb (hand or ankle) is fixed at a point, and the elbow or knee is solved by inverse kinematics. `bend` chooses which way the middle joint folds; try both and look.
  - Pin hands and feet that touch the floor, so they do not slide during the movement. A limb may be pinned in one keyframe and free in the next (a hand lifting off the floor).
- **Near and far limbs**: the figure faces right. Near limbs are drawn dark, far limbs faded. For symmetric movements use identical near and far limbs (`symmetric()` in `src/exercises/helpers.ts`). For one-sided movements, show the moving limb on the near side where possible.

## Animation

```ts
animation: {
  frames: [
    { pose: start, move: 1.2, hold: 0.5, label: 'Lower' },
    { pose: end, move: 1.5, hold: 1, label: 'Lift' },
  ],
  view: 'side',              // or 'top'
  wall: { x: 38 },           // optional wall (side view), surface at x
  viewBox: [x, y, w, h],     // frame around the movement
}
```

- Frames loop: the figure moves from the last keyframe back to the first. `move` is the time in seconds to reach the pose, with ease-in/ease-out. `hold` is the pause at the pose.
- **Timing**: use realistic tempos. Lowering phases are 1.5–3 s; lifting phases are 1–1.5 s. Holds and stretches can show a 2–4 s hold.
- **Labels**: one or two words naming the phase ("Lower", "Push", "Hold", "Reach"). The label is shown while the figure moves towards the keyframe and while it holds there.
- **viewBox**: keep about a 3:2 to 2:1 width:height ratio for floor exercises and a near-square or tall frame for standing ones. Leave room for the head and the far-reaching limbs; tests fail if anything is clipped.

### Top view (`view: 'top'`)

The camera looks down at a person lying on the mat. Use it when the important shape is not visible from the side, for example prone Y/T/W arm positions, arm sweeps, or the thoracic open book.

- The figure lies along the x axis, head to the right (torso angle 90). Near and far limbs are the two sides of the body, one on each side of the torso: for a prone T, use arm angles 0 and 180.
- `lift: { arms, legs, chest }` with values 0–1 draws a shadow under the parts that are lifted off the floor. The parts themselves do not move.
- Floor-related tests are skipped in top view; the frame must contain everything.

### Lying on the side (clamshell, side-lying hip abduction, side plank)

Use side view and treat the figure as seen **from the front** while lying on its side. The torso is horizontal on the floor; the top leg is the near leg and moves in the picture plane (abduction lifts it upwards on screen). The bottom leg is the far leg.

## Exercise record

See `src/exercises/types.ts`. Fill every field:

- **`cls`** sets the rep or hold range:
  - `strength` 6–12 reps;
  - `endurance` 10–20 reps;
  - `hold` 20–45 s;
  - `cuff` 12–20 reps;
  - `stretch` 30 s holds (target `[30, 30]`, or `[30, 45]` for mobility days);
  - `drill` for warm-up moves.
- **`regions`** lists every problem joint the exercise loads. Kneeling counts as knee load. Hands on the floor count as wrist load. Arms overhead or bearing weight count as shoulder load.
- **`perSide: true`** for one-sided exercises.
- **`cues`**: 2–4 short instructions, from start position to finish. **`cautions`**: knee, wrist or shoulder notes taken from `docs/EVIDENCE.md`.
- Use the IDs and names from the "Exercise candidates" tables in `docs/EVIDENCE.md`.

## Checking your work

```sh
npx vitest run                                          # geometry and metadata tests
npx tsc --noEmit                                        # types
node scripts/review.mjs /path/to/out.png P1 P2 [--dark] # keyframes and mid-movement frames as an image
```

Open the PNG and check each exercise against how a physiotherapist would demonstrate it:

- the joint angles are right;
- contact points stay on the floor;
- the back is straight unless the exercise needs otherwise;
- the head is in line with the spine;
- nothing passes through the floor or the wall.
