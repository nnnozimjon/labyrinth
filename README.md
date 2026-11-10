# Labyrinth

A tilt-maze browser game built with Three.js and Rapier physics. Tilt the board with the
on-screen joystick to roll the ball through three levels: steer it into the gate to finish a
level, and keep it out of the loss holes. The interface is in Russian.

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Vite serves the game (by default at http://localhost:5173) and opens it in your browser.

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server with hot reload                       |
| `npm run typecheck` | TypeScript check only (`tsc`)                    |
| `npm run build`     | Type-check, then production build into `dist/`   |

## How to play

- Press start, then drag the joystick to tilt the board. Let go and the board eases back to
  level.
- Roll the ball into the gate to complete the level.
- Levels 2 and 3 have loss holes. Falling into one plays the fail effect and puts the ball back
  at the start of the level.
- Level 3 has a gift box on the board; roll into it for a bonus screen.
- Progress is saved in `localStorage` under `f55-game:level`, so a reload resumes the last
  level. Finishing level 3 clears it.

## Project layout

```text
src/
  main.ts             entry point
  app/
    Game.ts           boot: loading screen, UI overlays, wiring
    game-world.ts     loads assets and builds the scene and physics world once
    game-session.ts   round state machine: start, playing, won, lost, gift, level change
    game-loop.ts      per-frame loop: fixed-step physics, board tilt, rendering
    debug-tools.ts    optional debug panels and helpers
  physics/            Rapier world, fixed timestep, board frame, containment, drop monitor
  entities/           ball, board pieces (board, walls, gate, puzzles, stairs, fans, gift), holes
  levels/             level manager, per-level setup, spawn and hole positions, saved progress
  ui/                 DOM overlays: start, win, final win, gift, loading, fail effect, HUD
  audio/ input/ core/ utils/ assets/
scripts/              one-off asset tools (WebP textures, Draco models, .gltf → .glb packing, Brotli preview)
```

## Assets

The game never requests a `.bin` or audio file. Download managers such as Internet Download
Manager (IDM) catch requests for those file types and pop up download dialogs while the game
loads.

- Models are single `.glb` files. To add a model exported as `.gltf` plus `.bin`, put it in
  `public/` and pack it with `node scripts/pack-gltf-to-glb.mjs --delete-sources`.
- Sounds (`src/*.ogg`) are inlined into the JavaScript as `data:` URLs by the
  `inline-game-sounds` plugin in `vite.config.ts`, and imported from `virtual:game-sounds`. A
  new sound goes in that plugin's `GAME_SOUNDS` list and in `src/vite-env.d.ts`.

During `npm run dev`, Vite tells the browser to re-check every file on each reload
(`Cache-Control: no-cache`), so the loading screen fetches everything again each time. A
production build can be cached by the browser, depending on the host's cache headers.

## Physics notes

The ball used to vanish or get stuck because one slow frame turned into one large physics step.
A large enough step pushed the ball through the paper-thin board or the hollow walls, and once
it was on the table nothing put it back. The game now guards against that at several levels:

- **Fixed timestep.** Physics advances in 1/120 s steps however fast or slow the display is.
  Frame time is capped at 0.1 s, and time spent in a background tab is skipped. The ball is
  drawn interpolated between steps, so motion stays smooth.
- **Continuous collision detection** on the ball, so a fast ball cannot skip through thin
  colliders.
- **Containment walls.** Invisible solid boxes surround the play area and tilt with the board.
- **Drop monitor.** Every way out of play is a fall through the floor. `BallDropMonitor`
  notes which opening the ball went through (the gate, a hole, or neither), measured in the
  board's own tilted frame. It reports the result once the ball lands on the table, or after a
  timeout, so a ball can no longer be left stranded.
- **Invalid state.** If the physics produces non-finite values, the ball respawns.

Tuning values (timestep, ball size, trigger radii, tilt) are in `src/utils/constants.ts`.

## Debugging

The debug flags in `src/utils/constants.ts` are all off by default. While a flag is off, its
panel or renderer is left out of the production build.

| Flag                                                  | Effect                                                    |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `SHOW_COLLIDERS`                                      | Wireframes for every physics collider                     |
| `SHOW_LIGHT_HELPERS`                                  | Light position and direction helpers                      |
| `SHOW_DEBUG_HELPERS`                                  | Hole-trigger and other helper meshes                      |
| `ENABLE_ORBIT_CONTROLS`                               | Free camera orbit, pan and zoom                           |
| `DEBUG_LOG_SCENE_HIERARCHY`                           | Logs the scene graph on startup                           |
| `DEBUG_CAMERA_TRANSFORM`                              | Logs camera moves; C logs the pose, V copies it as code   |
| `DEBUG_SSS_UI`, `DEBUG_BULB_LIGHT`                    | lil-gui panels for wall scattering and the bulb light     |
| `DEBUG_HOLES_LEVEL3_UI`, `DEBUG_BALL_SPAWN_LEVEL3_UI` | lil-gui panels to place the level 3 holes and ball spawn  |
| `DEBUG_START_LEVEL`                                   | Start on a given level (1 means normal play)              |

## Stack

- [Three.js](https://threejs.org/) for rendering
- [@dimforge/rapier3d-compat](https://rapier.rs/) for physics
- [Vite](https://vitejs.dev/) and TypeScript for the dev server and build
