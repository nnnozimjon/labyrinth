# Three.js Physics Game

A minimal Three.js scene with Rapier physics: a sphere falls onto a ground plane and collides naturally.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the URL shown in the terminal (Vite may open it automatically). You should see a red sphere above a green ground plane. The sphere falls due to gravity and bounces on the plane.

## Controls

- **Left mouse drag** — orbit the camera
- **Right mouse drag** — pan
- **Scroll** — zoom

## Stack

- [Three.js](https://threejs.org/) — rendering, lighting, shadows, orbit controls
- [@dimforge/rapier3d-compat](https://rapier.rs/) — physics (static ground collider, dynamic sphere rigid body)
- [Vite](https://vitejs.dev/) + TypeScript — dev server and build
# labyrinth
