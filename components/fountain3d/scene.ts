import * as THREE from "three";

// The fountain you actually find in a US university hallway: a wall-mounted, stainless, bi-level
// cooler (a high basin and a lower ADA basin) with a bottle-filling station above the high side.
// Modeled in inches after the common ~37" wide x 39" high x 19" deep units, then scaled down.

export type SceneHandle = { dispose(): void };
type Options = {
  reducedMotion: boolean;
  /** Stage element; its size drives the canvas size. */
  root: HTMLElement;
  /** 0..1 progress through the pinned scroll section. */
  getProgress: () => number;
  /** Number shown on the bottle filler's "bottles saved" display. */
  counter: number;
};

const INCH = 1 / 22; // inches -> scene units
const HI_RIM = 41;
const LO_RIM = 36;
const UNIT_W = 18;
const UNIT_D = 19;

export function createFountainScene(canvas: HTMLCanvasElement, opts: Options): SceneHandle {
  const { reducedMotion, root, getProgress, counter } = opts;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const uTime = { value: 0 };

  // Reflections from a monochrome studio: big overhead softbox, strip lights, black walls.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(buildStudio(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 1.1;

  // The museum light: soft shadows of the basins on the wall plate sell the realism.
  const spot = new THREE.SpotLight(0xffffff, 80, 20, 0.36, 1, 1.6);
  spot.position.set(1.2, 7, 4);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.01;
  spot.shadow.radius = 6;
  scene.add(spot, spot.target);
  // Faint bounce from the hallway, so shadows on the wall aren't pure black.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.12));
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(-3, 2, -5);
  scene.add(rim);

  scene.add(buildLightCone());
  const dust = buildDust();
  scene.add(dust.points);

  // rig (pointer tilt) > turntable (scroll) > model (inches)
  const rig = new THREE.Group();
  scene.add(rig);
  const turntable = new THREE.Group();
  rig.add(turntable);
  const model = new THREE.Group();
  model.scale.setScalar(INCH);
  model.position.set(0, -41 * INCH, -(UNIT_D / 2) * INCH);
  turntable.add(model);
  const water = buildFountain(model, uTime, counter, envTexture);

  // ---------- Sizing ----------
  let wide = true;
  const resize = () => {
    const w = root.clientWidth;
    const h = root.clientHeight;
    wide = w >= 768;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  resize();

  // ---------- Input: drag to turn, pointer tilts slightly ----------
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let dragging = false;
  let lastX = 0;
  let dragOffset = 0;
  const onPointerMove = (e: PointerEvent) => {
    pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    if (dragging) {
      dragOffset = THREE.MathUtils.clamp(dragOffset + (e.clientX - lastX) * 0.004, -1.2, 1.2);
      lastX = e.clientX;
    }
  };
  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
  };
  const onPointerUp = () => (dragging = false);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  // ---------- Loop ----------
  const timer = new THREE.Timer();
  let elapsed = 0;
  let smoothP = getProgress();
  let rotation = -0.55;

  const frame = () => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    elapsed += dt;
    uTime.value = elapsed;

    // Ease toward scroll progress so wheel steps feel like a camera move, not a jump.
    smoothP += (getProgress() - smoothP) * (1 - Math.exp(-dt * 6));
    const p = smoothP;

    // Scroll turns it from a left three-quarter view to a right one. The back is a wall plate,
    // so it never spins all the way around.
    if (!dragging) dragOffset *= Math.exp(-dt * 1.5);
    const sway = reducedMotion ? 0 : Math.sin(elapsed * 0.25) * 0.08;
    const target = -0.55 + p * 1.1 + sway + dragOffset;
    rotation += (target - rotation) * (1 - Math.exp(-dt * 5));
    turntable.rotation.y = rotation;

    pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 3));
    rig.position.y = reducedMotion ? 0 : Math.sin(elapsed * 0.6) * 0.03;
    rig.rotation.x = pointer.y * 0.04;
    rig.rotation.z = -pointer.x * 0.02;

    const dist = (wide ? 7.6 : 10.6) * (1 - 0.1 * p);
    camera.position.set(Math.sin(pointer.x * 0.15) * 0.35, 1.1 + p * 0.5, dist);
    camera.lookAt(0, wide ? 0.05 : -0.2, 0);

    water.update(elapsed);
    dust.update(elapsed);
    renderer.render(scene, camera);
  };

  let running = false;
  const visibility = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      timer.reset();
      renderer.setAnimationLoop(frame);
    } else if (!entry.isIntersecting && running) {
      renderer.setAnimationLoop(null);
    }
    running = entry.isIntersecting;
  });
  visibility.observe(canvas);
  frame();

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      });
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

// =====================================================================
// Model (all dimensions in inches; x = along the wall, y = up, z = out from the wall)
// =====================================================================

type Materials = ReturnType<typeof makeMaterials>;

function makeMaterials() {
  // Stainless with a horizontal brushed grain. Extrude UVs are in inches, so the grain is scaled to match.
  const grain = brushedTexture(1 / 20);
  const grainSideways = brushedTexture(1 / 20);
  grainSideways.center.set(0.5, 0.5);
  grainSideways.rotation = Math.PI / 2;
  const brushed = (map: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({ color: "#c4c6c9", metalness: 1, roughness: 1, roughnessMap: map, bumpMap: map, bumpScale: 0.4 });
  return {
    cabinet: brushed(grain),
    housing: brushed(grainSideways),
    basin: new THREE.MeshPhysicalMaterial({ color: "#dcdde0", metalness: 1, roughness: 1, roughnessMap: smudgeTexture() }),
    chrome: new THREE.MeshPhysicalMaterial({ color: "#f2f2f2", metalness: 1, roughness: 0.07 }),
    satin: new THREE.MeshPhysicalMaterial({ color: "#b9bbbe", metalness: 1, roughness: 0.3 }),
    gap: new THREE.MeshStandardMaterial({ color: "#060606", roughness: 0.9 }),
    plastic: new THREE.MeshPhysicalMaterial({ color: "#161616", roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
  };
}

function buildFountain(model: THREE.Group, uTime: { value: number }, counter: number, env: THREE.Texture) {
  const m = makeMaterials();
  const add = (parent: THREE.Object3D, mesh: THREE.Mesh, at?: [number, number, number]) => {
    if (at) mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  buildRoom(model, env);

  const hi = buildCooler(m, add, "left");
  hi.position.set(-UNIT_W / 2, HI_RIM, 0);
  model.add(hi);
  const lo = buildCooler(m, add, "right");
  lo.position.set(UNIT_W / 2, LO_RIM, 0);
  model.add(lo);

  const filler = buildBottleFiller(m, add, counter);
  filler.position.set(-UNIT_W / 2, HI_RIM + 3.2, 0);
  model.add(filler);

  // Water runs on the high side only.
  const water = buildWater(uTime, env);
  hi.add(water.group);
  return water;
}

// Where the bubbler sits in a cooler's local space (x across, z out from the wall).
// It stands on a flat ledge in the front corner of the basin and throws its arc back toward the drain.
const BUBBLER_AT = new THREE.Vector3(5.0, 0, 15.4);
const LANDING_AT = new THREE.Vector3(0.5, 0, 11.2);
const STREAM_R = 0.1; // a real bubbler stream is about 3/16" across
const NOZZLE_BASE = 1.0; // height of the nozzle's root above the ledge
const NOZZLE_LEN = 0.75;

/**
 * The stream is a true projectile arc. Time is in units where g = 1, so the shape depends only on
 * how high the water rises above the nozzle.
 */
function streamPath() {
  const RISE = 2.3;
  const flat = new THREE.Vector3(LANDING_AT.x - BUBBLER_AT.x, 0, LANDING_AT.z - BUBBLER_AT.z);
  const heading = flat.clone().normalize();
  const side = new THREE.Vector3().crossVectors(heading, new THREE.Vector3(0, 1, 0)).normalize();
  const deck = basinHeight(BUBBLER_AT.x, BUBBLER_AT.z);
  const endY = basinHeight(LANDING_AT.x, LANDING_AT.z) - 0.03;
  const vy = Math.sqrt(2 * RISE);
  // The nozzle points along the launch direction, and the launch point is the nozzle's tip: iterate to agree.
  let angle = 1.1;
  let from = new THREE.Vector3();
  let vx = 1;
  let T = 1;
  for (let i = 0; i < 4; i++) {
    const reach = 0.15 + Math.cos(angle) * NOZZLE_LEN;
    from = new THREE.Vector3(BUBBLER_AT.x, deck + NOZZLE_BASE + Math.sin(angle) * NOZZLE_LEN, BUBBLER_AT.z).addScaledVector(heading, reach);
    T = vy + Math.sqrt(vy * vy + 2 * (from.y - endY));
    vx = (flat.length() - reach) / T;
    angle = Math.atan2(vy, vx);
  }
  const at = (t: number, out: THREE.Vector3) => out.copy(from).addScaledVector(heading, vx * t).setY(from.y + vy * t - 0.5 * t * t);
  const speed = (t: number) => Math.hypot(vx, vy - t);
  const tangent = (t: number, out: THREE.Vector3) => out.copy(heading).multiplyScalar(vx).setY(vy - t).normalize();
  return { T, angle, heading, side, from, at, speed, tangent, end: at(T, new THREE.Vector3()) };
}

/** One cooler: sculpted basin top, brushed cabinet that tapers back to the wall, push bar, bubbler. */
function buildCooler(m: Materials, add: AddFn, outerSide: "left" | "right") {
  const g = new THREE.Group();

  // Basin + rim as one displaced surface
  add(g, new THREE.Mesh(basinGeometry(), m.basin));

  // Cabinet: side profile extruded across the unit's width
  const profile = new THREE.Shape();
  const pts: [number, number][] = [
    [0, -3.8],
    [18.65, -3.8],
    [18.65, -4.6],
    [16.6, -8.4],
    [7.6, -20.5],
    [0, -20.5],
  ];
  profile.moveTo(...pts[0]);
  for (const p of pts.slice(1)) profile.lineTo(...p);
  profile.closePath();
  const width = UNIT_W - 0.7;
  const cabinet = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.35,
    bevelSegments: 5,
  });
  cabinet.rotateY(-Math.PI / 2);
  cabinet.translate(width / 2, 0, 0);
  add(g, new THREE.Mesh(cabinet, m.cabinet));

  // The top is a separate pan whose skirt laps over the cabinet. It is hollow, so the basin can
  // sink below the rim without the cabinet showing through it.
  const skirtShape = traceRoundedRect(new THREE.Shape(), UNIT_W, UNIT_D, 0.8, 0, -UNIT_D);
  skirtShape.holes.push(traceRoundedRect(new THREE.Path(), UNIT_W - 0.5, UNIT_D - 0.5, 0.6, 0, -UNIT_D + 0.25));
  const skirt = new THREE.ExtrudeGeometry(skirtShape, { depth: 3.3, bevelEnabled: false, curveSegments: 12 });
  skirt.rotateX(-Math.PI / 2);
  add(g, new THREE.Mesh(skirt, m.housing), [0, -3.6, 0]);

  // Front push bar, with a dark shadow gap around it
  add(g, new THREE.Mesh(roundedBox(14.6, 2.3, 0.3, 0.12), m.gap), [0, -2.75, 18.95]);
  add(g, new THREE.Mesh(roundedBox(14, 1.8, 0.8, 0.35), m.satin), [0, -2.75, 19.25]);

  // Side push pad on the outer side
  const sx = outerSide === "left" ? -1 : 1;
  add(g, new THREE.Mesh(roundedBox(0.3, 2.3, 4.8, 0.12), m.gap), [sx * 9.02, -2.75, 14.6]);
  add(g, new THREE.Mesh(roundedBox(0.7, 1.8, 4.2, 0.3), m.satin), [sx * 9.2, -2.75, 14.6]);

  // Drain with strainer bars
  const drainY = basinHeight(0, DRAIN_Z);
  const drain = new THREE.Group();
  drain.position.set(0, drainY + 0.02, DRAIN_Z);
  g.add(drain);
  add(drain, new THREE.Mesh(new THREE.CircleGeometry(0.85, 40).rotateX(-Math.PI / 2), m.gap));
  add(drain, new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 10, 48).rotateX(Math.PI / 2), m.chrome));
  for (let i = 0; i < 4; i++) {
    const bar = add(drain, new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.14), m.chrome), [0, 0.02, 0]);
    bar.rotation.y = (i * Math.PI) / 4;
  }

  g.add(buildBubbler(m, add));

  return g;
}

/**
 * The bubbler: a chrome body on a flange, the little nozzle the water leaves from, and the hood
 * that keeps mouths off it. Built facing +z, then turned to face the drain.
 */
function buildBubbler(m: Materials, add: AddFn) {
  const path = streamPath();
  const b = new THREE.Group();
  b.position.set(BUBBLER_AT.x, basinHeight(BUBBLER_AT.x, BUBBLER_AT.z), BUBBLER_AT.z);
  b.rotation.y = Math.atan2(path.heading.x, path.heading.z);

  // Body: flange, a short waist, and a domed head, turned as one piece.
  const profile: [number, number][] = [
    [0, 0], [0.95, 0], [0.97, 0.06], [0.95, 0.12], [0.76, 0.19], [0.62, 0.3], [0.57, 0.5], [0.56, 0.8],
    [0.52, 0.98], [0.43, 1.12], [0.29, 1.21], [0.14, 1.25], [0, 1.26],
  ];
  add(b, new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 64), m.chrome));
  // Gasket between flange and steel.
  add(b, new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.04, 48), m.plastic), [0, 0.0, 0]);

  // Nozzle: a tapered spout with a knurled collar, aimed exactly along the stream's launch direction.
  const aim = new THREE.Vector3(0, Math.sin(path.angle), Math.cos(path.angle));
  const nozzle = new THREE.Group();
  nozzle.position.set(0, NOZZLE_BASE, 0.15);
  nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
  b.add(nozzle);
  const spout: [number, number][] = [
    [0.2, 0], [0.2, NOZZLE_LEN - 0.3], [0.165, NOZZLE_LEN - 0.22], [0.15, NOZZLE_LEN - 0.03], [0.135, NOZZLE_LEN],
    [STREAM_R + 0.012, NOZZLE_LEN], [STREAM_R + 0.012, NOZZLE_LEN - 0.12],
  ];
  add(nozzle, new THREE.Mesh(new THREE.LatheGeometry(spout.map(([r, y]) => new THREE.Vector2(r, y)), 40), m.chrome));
  const collar = add(nozzle, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.16, 12), m.satin), [0, NOZZLE_LEN - 0.42, 0]);
  collar.rotation.y = 0.3;
  add(nozzle, new THREE.Mesh(new THREE.CircleGeometry(STREAM_R + 0.012, 24).rotateX(-Math.PI / 2), m.gap), [0, NOZZLE_LEN - 0.12, 0]);

  // Hood: a chrome shell cupped behind and over the nozzle; the stream leaves through the open side.
  const hoodMat = m.chrome.clone();
  hoodMat.side = THREE.DoubleSide;
  const hood = add(b, new THREE.Mesh(new THREE.SphereGeometry(0.44, 48, 20, 0, Math.PI * 2, 0, 1.0), hoodMat));
  hood.position.copy(nozzle.position).addScaledVector(aim, NOZZLE_LEN * 0.3);
  hood.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.35, -0.94).normalize());
  hood.scale.set(1.08, 1, 1);
  return b;
}

type AddFn = (parent: THREE.Object3D, mesh: THREE.Mesh, at?: [number, number, number]) => THREE.Mesh;

const DRAIN_Z = 12.4;

function sdRoundRect(x: number, z: number, hx: number, hz: number, r: number) {
  const qx = Math.abs(x) - (hx - r);
  const qz = Math.abs(z) - (hz - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Height of the cooler top at (x, z): flat rim, a rounded bead, then a dished basin sloping to the drain. */
function basinHeight(x: number, z: number) {
  const dOuter = sdRoundRect(x, z - UNIT_D / 2, UNIT_W / 2, UNIT_D / 2, 0.8);
  const dIn = sdRoundRect(x, z - 10.4, 7.2, 7.4, 3.2);
  // The bubbler stands on a flat ledge that pushes into the basin's front corner.
  const ledge = smoothstep(1.25, 3.3, Math.hypot(x - BUBBLER_AT.x, z - BUBBLER_AT.z));
  const dish = smoothstep(0, 3.4, -dIn) * ledge;
  const drainDip = Math.exp(-(x * x + (z - DRAIN_Z) ** 2) / 7);
  const bead = 0.14 * Math.exp(-(dIn * dIn) / 0.12);
  const roll = 0.5 * smoothstep(-0.7, 0, dOuter);
  return -2.5 * dish - 0.55 * dish * drainDip + bead - roll;
}

function basinGeometry() {
  const geo = new THREE.PlaneGeometry(UNIT_W, UNIT_D, 150, 158);
  geo.rotateX(-Math.PI / 2); // plane now lies in x/z, with z running -9.5..9.5
  geo.translate(0, 0, UNIT_D / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, basinHeight(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  return geo;
}

/** Bottle-filling station: brushed housing with a recessed alcove, spout, sensor, drip tray, counter display. */
function buildBottleFiller(m: Materials, add: AddFn, counter: number) {
  const g = new THREE.Group();
  const W = 16;
  const H = 25;
  const D = 4.6;
  const outer = traceRoundedRect(new THREE.Shape(), W, H, 1.4);
  outer.holes.push(traceRoundedRect(new THREE.Path(), 11.6, 13.4, 1.0, 0, 3.2));
  const housing = new THREE.ExtrudeGeometry(outer, {
    depth: D,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.35,
    bevelSegments: 5,
    curveSegments: 16,
  });
  add(g, new THREE.Mesh(housing, m.housing));

  // Alcove back wall, spout, sensor, drip tray
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(11.6, 13.4), m.plastic), [0, 3.2 + 6.7, 1.2]);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 28), m.chrome), [0, 16.6 - 0.45, 2.9]);
  add(g, new THREE.Mesh(new THREE.CircleGeometry(0.2, 16).rotateX(Math.PI / 2), m.gap), [0, 16.6 - 0.91, 2.9]);
  add(g, new THREE.Mesh(roundedBox(1.6, 0.6, 0.3, 0.12), m.plastic), [3.3, 15.4, 1.35]);
  const tray = add(
    g,
    new THREE.Mesh(
      new THREE.BoxGeometry(11.2, 0.35, 3.8),
      new THREE.MeshStandardMaterial({ map: trayTexture(), roughness: 0.6, metalness: 0.3 }),
    ),
    [0, 3.35, 2.9],
  );
  tray.castShadow = false;

  // Display: glossy black glass with an LED counter
  add(g, new THREE.Mesh(roundedBox(12.4, 5.2, 0.3, 0.2), m.plastic), [0, 20.6, D + 0.4]);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 4.8),
    new THREE.MeshPhysicalMaterial({
      color: "#000000",
      roughness: 0.05,
      clearcoat: 1,
      emissive: "#ffffff",
      emissiveMap: displayTexture(counter),
      emissiveIntensity: 1.5,
    }),
  );
  screen.position.set(0, 20.6, D + 0.62);
  g.add(screen);
  return g;
}

function buildWater(uTime: { value: number }, env: THREE.Texture) {
  const group = new THREE.Group();
  const path = streamPath();

  // ---------- The stream: a tube reshaped every frame ----------
  // Its radius follows continuity (slow water at the top of the arc is thicker, falling water thins),
  // and surface-tension ripples grow as they ride downstream until the jet is close to breaking up.
  const SEG = 180;
  const RAD = 14;
  const ring = RAD + 1;
  const positions = new Float32Array((SEG + 1) * ring * 3);
  const normals = new Float32Array((SEG + 1) * ring * 3);
  const uvs = new Float32Array((SEG + 1) * ring * 2);
  const index: number[] = [];
  for (let i = 0; i <= SEG; i++)
    for (let j = 0; j <= RAD; j++) {
      uvs.set([i / SEG, j / RAD], (i * ring + j) * 2);
      if (i < SEG && j < RAD) {
        const a = i * ring + j;
        index.push(a, a + ring, a + 1, a + 1, a + ring, a + ring + 1);
      }
    }
  const stream = new THREE.BufferGeometry();
  stream.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  stream.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  stream.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  stream.setIndex(index);

  const FLOW = path.T / 0.36; // the water is in the air for about a third of a second
  const v0 = path.speed(0);
  const center = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const lift = new THREE.Vector3();
  const shapeStream = (time: number) => {
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const t = u * path.T;
      path.at(t, center);
      path.tangent(t, tan);
      lift.crossVectors(path.side, tan);
      const grow = smoothstep(0.12, 1, u);
      const phase = t - time * FLOW; // features are carried along at the water's own speed
      const ripple = grow * (0.13 * Math.sin(phase * 15) + 0.08 * Math.sin(phase * 6.3 + 1.3) + 0.05 * Math.sin(phase * 27 + 0.4));
      const r = STREAM_R * Math.min(Math.sqrt(v0 / path.speed(t)), 1.5) * (1 + ripple);
      center.addScaledVector(path.side, grow * 0.03 * Math.sin(phase * 3.7 + 0.7));
      center.addScaledVector(lift, grow * 0.02 * Math.sin(phase * 4.9));
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const o = (i * ring + j) * 3;
        const nx = c * path.side.x + s * lift.x;
        const ny = c * path.side.y + s * lift.y;
        const nz = c * path.side.z + s * lift.z;
        normals[o] = nx;
        normals[o + 1] = ny;
        normals[o + 2] = nz;
        positions[o] = center.x + nx * r;
        positions[o + 1] = center.y + ny * r;
        positions[o + 2] = center.z + nz * r;
      }
    }
    stream.attributes.position.needsUpdate = true;
    stream.attributes.normal.needsUpdate = true;
  };
  shapeStream(0);
  stream.computeBoundingSphere();

  // Clear water body: refraction + reflections, no color.
  group.add(
    new THREE.Mesh(
      stream,
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0.015,
        transmission: 1,
        thickness: 0.35,
        ior: 1.33,
        envMap: env,
        envMapIntensity: 2.4,
      }),
    ),
  );

  // Glints: a bright rim where the stream turns away from the eye, and streaks carried downstream.
  group.add(
    new THREE.Mesh(
      stream,
      new THREE.ShaderMaterial({
        uniforms: { uTime, uFlow: { value: FLOW / path.T } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position + normal * 0.004, 1.0);
            vV = -mv.xyz;
            vN = normalMatrix * normal;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uFlow;
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float facing = abs(dot(normalize(vN), normalize(vV)));
            float rim = pow(1.0 - facing, 2.5);
            // A tube of water acts as a lens: one sharp line of light runs along it.
            float line = smoothstep(0.035, 0.0, abs(vUv.y - 0.22)) + 0.5 * smoothstep(0.02, 0.0, abs(vUv.y - 0.7));
            float along = vUv.x - uTime * uFlow;
            float streak = pow(max(sin(along * 70.0 + sin(vUv.y * 6.2831) * 0.8), 0.0), 12.0);
            float a = 0.05 + rim * 0.55 + line * (0.35 + 0.3 * streak) + streak * 0.12 * smoothstep(0.1, 0.6, vUv.x);
            a *= smoothstep(0.0, 0.015, vUv.x) * smoothstep(1.0, 0.985, vUv.x);
            gl_FragColor = vec4(vec3(1.0), a);
          }
        `,
      }),
    ),
  );

  // ---------- The water in the basin ----------
  // A clear film lying on the steel, from where the stream lands down to the drain. Clear water only
  // adds reflections, so the film is drawn additively: black, mirror-smooth, and reshaped by ripples.
  const N = 80;
  const HALF = 4.4;
  const film = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N);
  film.rotateX(-Math.PI / 2);
  film.translate(0.4, 0, 11.8);
  const fp = film.attributes.position as THREE.BufferAttribute;
  const cover = new Float32Array(fp.count);
  const restY = new Float32Array(fp.count);
  const fromLanding = new Float32Array(fp.count);
  const colors = new Float32Array(fp.count * 4);
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i);
    const z = fp.getZ(i);
    const dL = Math.hypot(x - path.end.x, z - path.end.z);
    const dD = Math.hypot(x, z - DRAIN_Z);
    // Wet around the landing and around the drain, with the drain itself left open.
    cover[i] = Math.max(smoothstep(3.6, 1.0, dL), smoothstep(2.8, 1.1, dD)) * smoothstep(0.75, 1.15, dD);
    restY[i] = basinHeight(x, z);
    fromLanding[i] = dL;
    colors.set([1, 1, 1, cover[i]], i * 4);
  }
  film.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  const shapeFilm = (time: number) => {
    for (let i = 0; i < fp.count; i++) {
      const d = fromLanding[i];
      const x = fp.getX(i);
      const z = fp.getZ(i);
      const rings = 0.055 * Math.sin(d * 10 - time * 14) * Math.exp(-d * 0.5);
      const chop = 0.018 * Math.sin(x * 5.1 + time * 3.1) * Math.sin(z * 4.3 - time * 2.3);
      const mound = 0.07 * Math.exp(-(d * d) / 0.1);
      fp.setY(i, restY[i] - 0.02 + cover[i] * (0.05 + rings + chop + mound));
    }
    fp.needsUpdate = true;
    film.computeVertexNormals();
  };
  shapeFilm(0);
  const filmMesh = new THREE.Mesh(
    film,
    new THREE.MeshPhysicalMaterial({
      color: "#000000",
      metalness: 0,
      roughness: 0.03,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // Brighter than water's true 2% reflectance, so the ripples read at the size they are on screen.
      ior: 2,
      envMap: env,
      envMapIntensity: 3,
    }),
  );
  group.add(filmMesh);

  // ---------- Droplets thrown up where the stream lands ----------
  const COUNT = 70;
  const dropPos = new Float32Array(COUNT * 3);
  const alphas = new Float32Array(COUNT);
  const seeds = Array.from({ length: COUNT }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  const splash = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        uniform float uScale;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uScale * 13.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float a = smoothstep(0.5, 0.15, length(gl_PointCoord - 0.5)) * vAlpha;
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `,
    }),
  );
  splash.frustumCulled = false;
  group.add(splash);

  const update = (t: number) => {
    shapeStream(t);
    shapeFilm(t);
    for (let i = 0; i < COUNT; i++) {
      const [a, b, c, d] = seeds[i];
      const life = 0.22 + b * 0.22;
      const age = ((a + t / life) % 1) * life;
      const angle = c * Math.PI * 2;
      const out = 1.5 + d * 4;
      const y = (4 + b * 6) * age - 38 * age * age;
      // Droplets keep some of the stream's forward motion.
      dropPos[i * 3] = path.end.x + (Math.cos(angle) * out + path.heading.x * 3) * age;
      dropPos[i * 3 + 1] = path.end.y + 0.05 + Math.max(y, 0);
      dropPos[i * 3 + 2] = path.end.z + (Math.sin(angle) * out + path.heading.z * 3) * age;
      alphas[i] = y < 0 ? 0 : (1 - age / life) * 0.6;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  };
  return { group, update };
}

// =====================================================================
// Room: the painted cinderblock hallway wall the unit hangs on, and a waxed tile floor
// =====================================================================

function buildRoom(model: THREE.Group, env: THREE.Texture) {
  // envMapIntensity only applies when a material has its own envMap (scene.environment ignores it).
  // Wall: 16" x 8" blocks with recessed mortar joints, under a few coats of eggshell paint.
  const WALL_W = 420;
  const WALL_H = 130;
  const block = cinderblockTextures();
  for (const t of [block.bump, block.rough]) t.repeat.set(WALL_W / 64, WALL_H / 32);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, WALL_H),
    new THREE.MeshPhysicalMaterial({
      color: "#7c7b78",
      roughness: 1,
      roughnessMap: block.rough,
      bumpMap: block.bump,
      bumpScale: 1.6,
      // Lit almost only by the spot, so the wall falls off to black away from the fountain.
      envMap: env,
      envMapIntensity: 0.04,
    }),
  );
  wall.position.set(0, WALL_H / 2, -0.4);
  wall.receiveShadow = true;
  model.add(wall);

  // Floor: 12" vinyl tiles, waxed to a soft sheen.
  const tile = floorTexture();
  tile.repeat.set(WALL_W / 48, 80 / 48);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_W, 80),
    new THREE.MeshPhysicalMaterial({
      color: "#6a6865",
      map: tile,
      roughness: 0.42,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
      envMap: env,
      envMapIntensity: 0.12,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 40 - 0.4);
  floor.receiveShadow = true;
  model.add(floor);

  // Cove base where wall meets floor.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_W, 4, 0.25),
    new THREE.MeshPhysicalMaterial({ color: "#1b1b1b", roughness: 0.5, envMap: env, envMapIntensity: 0.1 }),
  );
  base.position.set(0, 2, -0.27);
  base.receiveShadow = true;
  model.add(base);

  // Contact shadows: soft darkening where the steel meets the wall (ambient occlusion the spot can't give).
  const ao = softRectTexture();
  const contact = (cx: number, cy: number, w: number, h: number, strength: number) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: "#000000", alphaMap: ao, transparent: true, opacity: strength, depthWrite: false }),
    );
    mesh.position.set(cx, cy, -0.36);
    model.add(mesh);
  };
  contact(-UNIT_W / 2, HI_RIM - 10, UNIT_W + 7, 28, 0.75);
  contact(UNIT_W / 2, LO_RIM - 10, UNIT_W + 7, 28, 0.75);
  contact(-UNIT_W / 2, HI_RIM + 3.2 + 12.5, 16 + 6, 31, 0.6);
}

// Bump + roughness maps for a painted block wall. The texture covers 4 x 4 blocks (64" x 32").
function cinderblockTextures() {
  const W = 1024;
  const H = 512;
  const px = W / 64; // pixels per inch
  const bump = document.createElement("canvas");
  bump.width = W;
  bump.height = H;
  const b = bump.getContext("2d")!;
  b.fillStyle = "rgb(150,150,150)";
  b.fillRect(0, 0, W, H);
  // Pitted block face under the paint
  for (let i = 0; i < 9000; i++) {
    const v = 120 + Math.random() * 60;
    b.fillStyle = `rgba(${v},${v},${v},0.5)`;
    const r = Math.random() * 2.2 + 0.4;
    b.beginPath();
    b.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
    b.fill();
  }
  // Mortar joints, running bond: horizontal every 8", vertical every 16" offset per course.
  const joint = 0.45 * px;
  b.fillStyle = "rgb(60,60,60)";
  b.filter = "blur(1.5px)";
  for (let row = 0; row < 4; row++) {
    const y = row * 8 * px;
    b.fillRect(0, y - joint / 2, W, joint);
    if (row === 0) b.fillRect(0, H - joint / 2, W, joint);
    for (let col = -1; col < 5; col++) {
      const x = (col * 16 + (row % 2) * 8) * px;
      b.fillRect(x - joint / 2, y, joint, 8 * px);
    }
  }
  b.filter = "none";

  // Roughness: paint is fairly matte, a bit shinier on worn, touched areas.
  const rough = document.createElement("canvas");
  rough.width = W;
  rough.height = H;
  const r = rough.getContext("2d")!;
  r.fillStyle = "rgb(205,205,205)";
  r.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const rad = 20 + Math.random() * 90;
    const g = r.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(150,150,150,0.5)");
    g.addColorStop(1, "rgba(150,150,150,0)");
    r.fillStyle = g;
    r.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const wrap = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { bump: wrap(bump), rough: wrap(rough) };
}

// 12" speckled vinyl composition tiles, 4 x 4 per texture, with faint seams and shade variation.
function floorTexture() {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const t = S / 4;
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const v = 170 + Math.random() * 25;
      ctx.fillStyle = `rgb(${v},${v},${v - 4})`;
      ctx.fillRect(i * t, j * t, t, t);
    }
  for (let i = 0; i < 14000; i++) {
    const v = Math.random() < 0.5 ? 90 + Math.random() * 40 : 215 + Math.random() * 40;
    ctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
  }
  ctx.fillStyle = "rgba(40,40,40,0.5)";
  for (let k = 0; k <= 4; k++) {
    ctx.fillRect(k * t - 1, 0, 2, S);
    ctx.fillRect(0, k * t - 1, S, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// A blurred white rectangle on black: alpha mask for the contact shadows.
function softRectTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, S, S);
  ctx.filter = "blur(22px)";
  ctx.fillStyle = "#fff";
  ctx.fillRect(S * 0.2, S * 0.18, S * 0.6, S * 0.64);
  return new THREE.CanvasTexture(c);
}

// =====================================================================
// Atmosphere
// =====================================================================

function buildLightCone() {
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 2.1, 8, 96, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = -mv.xyz;
          vN = normalMatrix * normal;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float facing = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.0);
          float a = facing * pow(vUv.y, 1.4) * 0.06 * smoothstep(0.0, 0.25, vUv.y);
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `,
    }),
  );
  cone.position.set(0.15, 2.6, 0.3);
  cone.rotation.z = -0.1;
  return cone;
}

function buildDust() {
  const COUNT = 420;
  const base = new Float32Array(COUNT * 3);
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = Math.sqrt(Math.random()) * 2.4;
    const a = Math.random() * Math.PI * 2;
    base.set([Math.cos(a) * r, Math.random() * 6 - 2.5, Math.sin(a) * r], i * 3);
    sizes[i] = 0.4 + Math.random() ** 3 * 2.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uScale;
        varying float vLit;
        void main() {
          // Motes only catch light inside the cone.
          float r = length(position.xz);
          float coneR = mix(2.1, 0.12, clamp((position.y + 1.4) / 8.0, 0.0, 1.0));
          vLit = smoothstep(coneR, coneR * 0.4, r);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale * 14.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLit;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vLit * 0.45;
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `,
    }),
  );
  points.frustumCulled = false;
  const update = (t: number) => {
    for (let i = 0; i < COUNT; i++) {
      const y = ((base[i * 3 + 1] + t * 0.04 + 2.5) % 6) - 2.5;
      positions[i * 3] = base[i * 3] + Math.sin(t * 0.21 + i) * 0.06;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + i * 1.3) * 0.06;
    }
    geo.attributes.position.needsUpdate = true;
  };
  update(0);
  return { points, update };
}

function buildStudio() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: "#020202", side: THREE.BackSide })));
  const panel = (w: number, h: number, k: number, pos: [number, number, number]) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }),
    );
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(9, 9, 2.6, [0, 10, 0]); // overhead softbox
  panel(4, 11, 2.2, [-6, 1, 3]); // big left softbox
  panel(1.5, 12, 1.7, [6, 1, 1]); // right strip
  panel(2.5, 10, 1.9, [2, 1, -8]); // back rim strip
  panel(3, 5, 1.2, [-3, 2, 7]); // front-left key
  panel(10, 0.35, 3.2, [0, 4, 6]); // thin horizontal strip: crisp line along the rims
  panel(20, 20, 0.35, [0, -6, 0]); // floor bounce
  return env;
}

// =====================================================================
// Helpers
// =====================================================================

/** Draws a rounded rectangle into `p`, centered on x = cx, spanning y0..y0 + h. */
function traceRoundedRect<T extends THREE.Path>(p: T, w: number, h: number, r: number, cx = 0, y0 = 0): T {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y1 = y0 + h;
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r);
  p.quadraticCurveTo(x1, y1, x1 - r, y1);
  p.lineTo(x0 + r, y1);
  p.quadraticCurveTo(x0, y1, x0, y1 - r);
  p.lineTo(x0, y0 + r);
  p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}

/** A box with every edge rounded by `r`, centered on the origin. */
function roundedBox(w: number, h: number, d: number, r: number) {
  const iw = w - 2 * r;
  const ih = h - 2 * r;
  const corner = Math.max(Math.min(r, iw / 2, ih / 2) * 0.98, 0.001);
  const geo = new THREE.ExtrudeGeometry(traceRoundedRect(new THREE.Shape(), iw, ih, corner), {
    depth: Math.max(d - 2 * r, 0.01),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

// Fine grain for brushed steel (used as both roughness and bump). `scale` maps inch-based UVs to the texture.
function brushedTexture(scale: number) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 4;
  const ctx = c.getContext("2d")!;
  for (let x = 0; x < c.width; x++) {
    const v = 95 + Math.random() * 45 + (Math.random() < 0.02 ? 50 : 0);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(scale, scale);
  tex.anisotropy = 8;
  return tex;
}

// Fingerprints and dried water spots: low roughness with soft blotches.
function smudgeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgb(24,24,24)";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 6 + Math.random() ** 2 * 45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = 45 + Math.random() * 55;
    g.addColorStop(0, `rgba(${v},${v},${v},0.8)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Slotted drip tray.
function trayTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a3b3d";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#050505";
  for (let y = 24; y < 240; y += 26) {
    ctx.beginPath();
    ctx.roundRect(28, y, 456, 10, 5);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// LED counter: unlit segments ghosted behind the lit digits, like a real 7-segment display.
function displayTexture(counter: number) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 410;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "600 34px ui-monospace, Menlo, monospace";
  ctx.fillText("B O T T L E S   S A V E D", 512, 360);
  ctx.textAlign = "left";
  ctx.font = "600 26px ui-monospace, Menlo, monospace";
  ctx.fillText("FILTER", 70, 70);
  for (let i = 0; i < 3; i++) ctx.fillRect(190 + i * 34, 50, 26, 22);
  ctx.textAlign = "center";
  ctx.font = "700 190px ui-monospace, Menlo, monospace";
  ctx.globalAlpha = 0.09;
  ctx.fillText("8888888", 512, 285);
  ctx.globalAlpha = 1;
  ctx.fillText(String(Math.max(0, counter)).padStart(7, "0"), 512, 285);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
