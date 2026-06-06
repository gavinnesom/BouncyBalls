const TAU = Math.PI * 2;
const DESIGN_SIZE = 900;
const WALL_SEGMENTS = 240;
const ROTATION_SPEED = (42 * Math.PI) / 180;
const AUTO_SPAWN_INTERVAL = 0.5;
const ESCAPED_LIFETIME = 4.0;
const COLLISION_SLOP = 0.75;

const BASE_RADIUS = 300;
const BASE_BALL_RADIUS = 10;
const BASE_WALL_THICKNESS = 12;
const BASE_ESCAPE_BOX_HALF_SIZE = 410;

const settings = {
  playing: false,
  autoSpawn: false,
  debug: false,
  speed: 260,
  gapDegrees: 58,
  maxBalls: 20,
};

const sim = {
  balls: [],
  width: 900,
  height: 620,
  gapCenter: -Math.PI / 2,
  autoSpawnTimer: 0,
  lastTime: null,
};

const canvas = document.querySelector("#bouncy-canvas");
const context = canvas.getContext("2d");
const statusReadout = document.querySelector("#status-readout");
const playToggle = document.querySelector("#play-toggle");
const resetButton = document.querySelector("#reset-button");
const spawnButton = document.querySelector("#spawn-button");
const autoToggle = document.querySelector("#auto-toggle");
const debugToggle = document.querySelector("#debug-toggle");
const stopButton = document.querySelector("#stop-button");
const speedSlider = document.querySelector("#speed-slider");
const gapSlider = document.querySelector("#gap-slider");
const maxSlider = document.querySelector("#max-slider");
const speedOutput = document.querySelector("#speed-output");
const gapOutput = document.querySelector("#gap-output");
const maxOutput = document.querySelector("#max-output");

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function multiply(vector, scalar) {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function length(vector) {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector) {
  const currentLength = length(vector);
  if (currentLength === 0) {
    return { x: 1, y: 0 };
  }
  return { x: vector.x / currentLength, y: vector.y / currentLength };
}

function withLength(vector, targetLength) {
  return multiply(normalize(vector), targetLength);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomBrightColor() {
  const red = Math.floor(randomBetween(70, 245));
  const green = Math.floor(randomBetween(120, 240));
  const blue = Math.floor(randomBetween(120, 255));
  return `rgb(${red}, ${green}, ${blue})`;
}

function angleDifference(a, b) {
  return ((((a - b + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}

function isAngleInsideGap(angle, gapCenter, gapSize) {
  return Math.abs(angleDifference(angle, gapCenter)) <= gapSize / 2;
}

function getScale() {
  return Math.min(sim.width, sim.height) / DESIGN_SIZE;
}

function getCenter() {
  return { x: sim.width / 2, y: sim.height / 2 };
}

function spawnBall() {
  const scale = getScale();
  const center = getCenter();
  const spawnAngle = randomBetween(0, TAU);
  const spawnDistance = randomBetween(85, 145) * scale;
  const radial = { x: Math.cos(spawnAngle), y: Math.sin(spawnAngle) };
  let tangent = { x: -radial.y, y: radial.x };

  if (Math.random() < 0.5) {
    tangent = multiply(tangent, -1);
  }

  const position = add(center, multiply(radial, spawnDistance));
  const velocitySeed = add(
    multiply(tangent, randomBetween(0.75, 1.0)),
    multiply(radial, randomBetween(-0.35, 0.35)),
  );

  return {
    position,
    velocity: withLength(velocitySeed, settings.speed * scale),
    color: randomBrightColor(),
    escaped: false,
    escapedAge: 0,
  };
}

function addBall() {
  if (sim.balls.length < settings.maxBalls) {
    sim.balls.push(spawnBall());
  }
}

function resetSimulation() {
  sim.balls = [spawnBall()];
  sim.gapCenter = -Math.PI / 2;
  sim.autoSpawnTimer = 0;
  sim.lastTime = null;
  updateControls();
}

function handleCircleCollision(ball) {
  const scale = getScale();
  const center = getCenter();
  const circleRadius = BASE_RADIUS * scale;
  const ballRadius = BASE_BALL_RADIUS * scale;
  const toBall = subtract(ball.position, center);
  const distance = length(toBall);

  if (distance === 0) {
    return;
  }

  const collisionDistance = circleRadius - ballRadius;
  if (distance < collisionDistance) {
    return;
  }

  const normal = multiply(toBall, 1 / distance);
  const boundaryAngle = Math.atan2(normal.y, normal.x);
  const gapSize = (settings.gapDegrees * Math.PI) / 180;

  if (isAngleInsideGap(boundaryAngle, sim.gapCenter, gapSize)) {
    ball.escaped = true;
    ball.escapedAge = 0;
    return;
  }

  const outwardSpeed = dot(ball.velocity, normal);
  if (outwardSpeed > 0) {
    ball.velocity = subtract(ball.velocity, multiply(normal, 2 * outwardSpeed));
  }

  ball.position = add(
    center,
    multiply(normal, collisionDistance - COLLISION_SLOP * scale),
  );
}

function escapedBallIsDone(ball) {
  const scale = getScale();
  const center = getCenter();
  const escapeHalfSize = BASE_ESCAPE_BOX_HALF_SIZE * scale;
  const outsideBox =
    ball.position.x < center.x - escapeHalfSize ||
    ball.position.x > center.x + escapeHalfSize ||
    ball.position.y < center.y - escapeHalfSize ||
    ball.position.y > center.y + escapeHalfSize;

  return outsideBox || ball.escapedAge >= ESCAPED_LIFETIME;
}

function updateSimulation(dt) {
  const gapSize = (settings.gapDegrees * Math.PI) / 180;
  sim.gapCenter = (sim.gapCenter + ROTATION_SPEED * dt) % TAU;

  if (settings.autoSpawn) {
    if (sim.balls.length >= settings.maxBalls) {
      sim.autoSpawnTimer = 0;
    } else {
      sim.autoSpawnTimer += dt;
      while (
        sim.autoSpawnTimer >= AUTO_SPAWN_INTERVAL &&
        sim.balls.length < settings.maxBalls
      ) {
        sim.balls.push(spawnBall());
        sim.autoSpawnTimer -= AUTO_SPAWN_INTERVAL;
      }

      if (sim.balls.length >= settings.maxBalls) {
        sim.autoSpawnTimer = 0;
      }
    }
  }

  for (const ball of sim.balls) {
    ball.position = add(ball.position, multiply(ball.velocity, dt));
    if (ball.escaped) {
      ball.escapedAge += dt;
    } else {
      handleCircleCollision(ball, gapSize);
    }
  }

  sim.balls = sim.balls.filter(
    (ball) => !(ball.escaped && escapedBallIsDone(ball)),
  );
}

function drawWall() {
  const scale = getScale();
  const center = getCenter();
  const circleRadius = BASE_RADIUS * scale;
  const wallThickness = Math.max(5, BASE_WALL_THICKNESS * scale);
  const gapSize = (settings.gapDegrees * Math.PI) / 180;
  let currentRun = [];
  const wallRuns = [];

  for (let index = 0; index <= WALL_SEGMENTS; index += 1) {
    const angle = (index / WALL_SEGMENTS) * TAU;
    const point = add(center, {
      x: Math.cos(angle) * circleRadius,
      y: Math.sin(angle) * circleRadius,
    });

    if (isAngleInsideGap(angle, sim.gapCenter, gapSize)) {
      if (currentRun.length > 1) {
        wallRuns.push(currentRun);
      }
      currentRun = [];
    } else {
      currentRun.push(point);
    }
  }

  if (currentRun.length > 1) {
    wallRuns.push(currentRun);
  }

  if (wallRuns.length > 1 && !isAngleInsideGap(0, sim.gapCenter, gapSize)) {
    wallRuns[0] = [...wallRuns[wallRuns.length - 1], ...wallRuns[0]];
    wallRuns.pop();
  }

  context.lineWidth = wallThickness;
  context.lineCap = "butt";
  context.lineJoin = "round";
  context.strokeStyle = "rgb(110, 231, 183)";

  for (const run of wallRuns) {
    context.beginPath();
    context.moveTo(run[0].x, run[0].y);
    for (let index = 1; index < run.length; index += 1) {
      context.lineTo(run[index].x, run[index].y);
    }
    context.stroke();
  }

  const markerDirection = {
    x: Math.cos(sim.gapCenter),
    y: Math.sin(sim.gapCenter),
  };
  const markerTip = add(center, multiply(markerDirection, circleRadius + 24 * scale));
  const markerBase = add(center, multiply(markerDirection, circleRadius + 42 * scale));
  const markerSide = multiply(
    { x: -markerDirection.y, y: markerDirection.x },
    7 * scale,
  );

  context.fillStyle = "rgb(248, 210, 138)";
  context.beginPath();
  context.moveTo(markerTip.x, markerTip.y);
  context.lineTo(markerBase.x + markerSide.x, markerBase.y + markerSide.y);
  context.lineTo(markerBase.x - markerSide.x, markerBase.y - markerSide.y);
  context.closePath();
  context.fill();
}

function drawDebugBoundary() {
  const scale = getScale();
  const center = getCenter();
  const size = BASE_ESCAPE_BOX_HALF_SIZE * 2 * scale;

  context.strokeStyle = "rgba(217, 224, 225, 0.32)";
  context.lineWidth = 1;
  context.strokeRect(center.x - size / 2, center.y - size / 2, size, size);
}

function drawBall(ball) {
  const radius = Math.max(5, BASE_BALL_RADIUS * getScale());

  context.fillStyle = ball.color;
  context.beginPath();
  context.arc(ball.position.x, ball.position.y, radius, 0, TAU);
  context.fill();
  context.strokeStyle = "rgba(245, 240, 231, 0.92)";
  context.lineWidth = 1.25;
  context.stroke();
}

function drawScene() {
  context.clearRect(0, 0, sim.width, sim.height);

  const gradient = context.createRadialGradient(
    sim.width * 0.45,
    sim.height * 0.35,
    10,
    sim.width / 2,
    sim.height / 2,
    Math.max(sim.width, sim.height) * 0.7,
  );
  gradient.addColorStop(0, "rgb(117, 133, 143)");
  gradient.addColorStop(1, "rgb(65, 75, 82)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, sim.width, sim.height);

  if (settings.debug) {
    drawDebugBoundary();
  }

  drawWall();
  for (const ball of sim.balls) {
    drawBall(ball);
  }
}

function updateControls() {
  statusReadout.textContent = `${sim.balls.length}/${settings.maxBalls} live balls`;
  playToggle.textContent = settings.playing ? "Pause" : "Play";
  autoToggle.textContent = `Auto-spawn ${settings.autoSpawn ? "On" : "Off"}`;
  autoToggle.classList.toggle("active", settings.autoSpawn);
  debugToggle.textContent = `Boundary ${settings.debug ? "On" : "Off"}`;
  debugToggle.classList.toggle("active", settings.debug);
  speedOutput.textContent = String(settings.speed);
  gapOutput.textContent = `${settings.gapDegrees} deg`;
  maxOutput.textContent = String(settings.maxBalls);
}

function resizeCanvas() {
  const bounds = canvas.parentElement.getBoundingClientRect();
  const cssWidth = Math.max(320, bounds.width);
  const cssHeight = Math.min(720, Math.max(390, cssWidth * 0.72));
  const deviceScale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(cssWidth * deviceScale);
  canvas.height = Math.floor(cssHeight * deviceScale);
  canvas.style.height = `${cssHeight}px`;
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);

  const sizeChanged = sim.width !== cssWidth || sim.height !== cssHeight;
  sim.width = cssWidth;
  sim.height = cssHeight;
  if (sizeChanged || sim.balls.length === 0) {
    resetSimulation();
  }
}

function animationLoop(time) {
  const previousTime = sim.lastTime ?? time;
  const dt = Math.min(0.033, (time - previousTime) / 1000);
  sim.lastTime = time;

  if (settings.playing) {
    updateSimulation(dt);
  }

  drawScene();
  updateControls();
  requestAnimationFrame(animationLoop);
}

playToggle.addEventListener("click", () => {
  settings.playing = !settings.playing;
  updateControls();
});

resetButton.addEventListener("click", resetSimulation);
spawnButton.addEventListener("click", addBall);

autoToggle.addEventListener("click", () => {
  settings.autoSpawn = !settings.autoSpawn;
  sim.autoSpawnTimer = 0;
  updateControls();
});

debugToggle.addEventListener("click", () => {
  settings.debug = !settings.debug;
  updateControls();
});

stopButton.addEventListener("click", () => {
  settings.playing = false;
  sim.balls = [];
  sim.autoSpawnTimer = 0;
  sim.lastTime = null;
  updateControls();
});

speedSlider.addEventListener("input", () => {
  settings.speed = Number(speedSlider.value);
  updateControls();
});

gapSlider.addEventListener("input", () => {
  settings.gapDegrees = Number(gapSlider.value);
  updateControls();
});

maxSlider.addEventListener("input", () => {
  settings.maxBalls = Number(maxSlider.value);
  sim.autoSpawnTimer = 0;
  sim.balls = sim.balls.slice(0, settings.maxBalls);
  updateControls();
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    addBall();
  } else if (event.key.toLowerCase() === "p") {
    settings.playing = !settings.playing;
  } else if (event.key.toLowerCase() === "r") {
    resetSimulation();
  } else if (event.key.toLowerCase() === "a") {
    settings.autoSpawn = !settings.autoSpawn;
  } else if (event.key.toLowerCase() === "d") {
    settings.debug = !settings.debug;
  }

  updateControls();
});

const observer = new ResizeObserver(resizeCanvas);
observer.observe(canvas.parentElement);
resizeCanvas();
requestAnimationFrame(animationLoop);
