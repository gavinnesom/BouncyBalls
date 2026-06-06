# Bouncy Balls

A small browser physics toy. Bright balls bounce inside a rotating circular wall until they find the moving gap and escape.

This is a plain static HTML/CSS/JavaScript app. It does not use React, Vite, Next.js, npm, a backend, or an external physics library.

## Tech Stack

- HTML
- CSS
- JavaScript
- Canvas

## Run Locally

Serve the folder with any simple static file server:

```bash
cd BouncyBalls
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

You can also open `index.html` directly in a browser.

## Controls

- Play/Pause: pause or resume the animation. The page opens paused.
- Reset: restart the simulation state
- Spawn Ball: add one ball
- Auto-spawn: toggle automatic spawning every 0.5 seconds. Auto-spawn opens off.
- Ball speed slider: change the speed used for new balls
- Gap size slider: make the rotating escape gap larger or smaller
- Max balls slider: set the live ball limit
- Boundary: show or hide the invisible post-escape square boundary
- Stop and Clear: pause the simulation and remove all balls

Keyboard shortcuts:

- `Space`: spawn a new ball
- `P`: pause or unpause
- `R`: reset the simulation
- `A`: toggle auto-spawn
- `D`: toggle the boundary

There is no Esc-to-quit behavior in the web version. The browser owns tab and window lifecycle.

## Collision model

Each ball has a position and velocity vector. On every frame, the simulation uses delta time to move the balls smoothly regardless of frame rate.

For balls still inside the circle, the code checks the distance from the ball to the circle center. When a ball reaches the circular wall, the boundary angle is compared with the current rotating gap angle:

- If the ball is inside the gap, it escapes and stops colliding with the circle.
- If the ball hits the solid wall, its velocity is reflected elastically around the wall normal.

After a bounce, the ball is nudged slightly back inside the circle so it does not get stuck repeatedly colliding with the wall. Escaped balls continue moving through an invisible square boundary and disappear after leaving that square or after a short lifetime.

The wall is drawn from sampled circle points using the same angle convention as the collision code. That keeps the visible gap, the debug marker, and the escape physics lined up.

## Deployment

This app is suitable for Vercel, Netlify, GitHub Pages, or any static hosting provider. The public files are `index.html`, `styles.css`, and `bouncyballs.js`.
