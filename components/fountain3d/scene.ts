import * as THREE from "three";

// A realistic stainless pedestal drinking fountain under a single museum light.
// Scroll drives everything: spin, an exploded technical view, then the water turning on.

export type SceneHandle = { dispose(): void };
type Options = {
  reducedMotion: boolean;
  /** Stage element: holds the [data-anchor] annotation labels positioned by this scene. */
  root: HTMLElement;
  /** 0..1 progress through the pinned scroll sequence. */
  getProgress: () => number;
};

// Fountain-space landmarks (y up, floor flange at y = 0).
const NOZZLE = new THREE.Vector3(-0.268, 2.258, 0);
const IMPACT = new THREE.Vector3(0.15, 2.106, 0);
const POOL_Y = 2.108;
const CENTER_OFFSET = -1.15;

type PartName = "base" | "pedestal" | "panel" | "bowl" | "drain" | "bubbler" | "guard" | "button";

// How far each part travels in the exploded view.
const EXPLODE: Record<PartName, [number, number, number]> = {
  base: [0, -0.5, 0],
  pedestal: [0, 0, 0],
  panel: [0, 0.05, 0.38],
  bowl: [0, 0.42, 0],
  drain: [0, 0.78, 0],
  bubbler: [0.05, 1.08, 0],
  guard: [-0.22, 1.3, 0],
  button: [0, 0.42, 0.5],
};

// Camera keyframes: [progress, camera height, distance factor, look-at height, horizontal skew (wide only)]
const CAMERA_KEYS = [
  [0.0, 0.45, 1.0, 0.12, 0],
  [0.12, 0.45, 1.0, 0.12, 0],
  [0.3, 1.9, 1.38, 0.5, 0],
  [0.54, 1.9, 1.38, 0.5, 0],
  [0.68, 2.5, 0.56, 1.0, -0.4],
  [0.84, 2.5, 0.56, 1.0, -0.4],
  [1.0, 0.9, 1.1, 0.25, 0],
];

export function createFountainScene(canvas: HTMLCanvasElement, opts: Options): SceneHandle {
  const { reducedMotion, root, getProgress } = opts;

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
  const uWater = { value: 0 };

  // Reflections from a monochrome studio: big overhead softbox, strip lights, black walls.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(buildStudio(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 1.15;

  // The museum light: casts the soft shadows that sell the realism.
  const spot = new THREE.SpotLight(0xffffff, 90, 20, 0.42, 1, 1.6);
  spot.position.set(0.9, 7.5, 1.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.015;
  spot.shadow.radius = 6;
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(-3, 2, -5);
  scene.add(rim);

  scene.add(buildLightCone());
  const dust = buildDust();
  scene.add(dust.points);

  // rig (tilt) > fountain (spin) > parts (explode)
  const rig = new THREE.Group();
  scene.add(rig);
  const fountain = new THREE.Group();
  fountain.position.y = CENTER_OFFSET;
  rig.add(fountain);
  const parts = buildFountain();
  for (const part of Object.values(parts)) fountain.add(part);
  const water = buildWater(uTime, uWater);
  parts.bowl.add(water.group);

  // Annotation labels live in the DOM; we project their 3D anchors every frame.
  const annotations = Array.from(root.querySelectorAll<HTMLElement>("[data-anchor]")).map((el) => {
    const [x, y, z] = el.dataset.anchor!.split(",").map(Number);
    return {
      el,
      part: parts[el.dataset.part as PartName],
      local: new THREE.Vector3(x, y, z),
      side: "right" as "left" | "right",
    };
  });

  // ---------- Sizing ----------
  let width = 1;
  let height = 1;
  let wide = true;
  const resize = () => {
    width = root.clientWidth;
    height = root.clientHeight;
    wide = width >= 768;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  resize();

  // ---------- Input: drag to spin, pointer tilts slightly ----------
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let dragging = false;
  let lastX = 0;
  let dragVelocity = 0;
  const onPointerMove = (e: PointerEvent) => {
    pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    if (dragging) {
      dragVelocity += (e.clientX - lastX) * 0.002;
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
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const world = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const edge = new THREE.Vector3();
  let elapsed = 0;
  let spin = 0;
  let smoothP = getProgress();
  let rotation = smoothP * Math.PI * 2;

  const frame = () => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    elapsed += dt;
    uTime.value = elapsed;

    // Ease toward scroll progress so wheel steps feel like a camera move, not a jump.
    smoothP += (getProgress() - smoothP) * (1 - Math.exp(-dt * 7));
    const p = smoothP;

    if (!reducedMotion) spin += dt * 0.12;
    spin += dragVelocity;
    dragVelocity *= Math.exp(-dt * 4);
    const free = spin + p * Math.PI * 2.2 - 0.5;
    // While the water is on, settle on a side-on angle so the arc reads left to right.
    const lock = smooth(0.6, 0.68, p) * (1 - smooth(0.85, 0.92, p));
    const presented = Math.round(free / (Math.PI * 2)) * Math.PI * 2 - 0.3 + Math.sin(elapsed * 0.35) * 0.12;
    const targetRotation = free + (presented - free) * lock;
    rotation += (targetRotation - rotation) * (1 - Math.exp(-dt * 6));
    fountain.rotation.y = rotation;

    // Exploded view
    const explode = smooth(0.15, 0.3, p) * (1 - smooth(0.54, 0.64, p));
    const e = easeInOut(explode);
    for (const [name, part] of Object.entries(parts)) {
      const [x, y, z] = EXPLODE[name as PartName];
      part.position.set(x * e, y * e, z * e);
    }
    parts.guard.rotation.z = -0.35 * e;
    parts.bubbler.rotation.z = 0.2 * e;

    // Water turns on after reassembly
    uWater.value = smooth(0.64, 0.72, p);
    water.update(elapsed, uWater.value);

    // Float and tilt
    pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 3));
    rig.position.y = (reducedMotion ? 0 : Math.sin(elapsed * 0.7) * 0.035) + smooth(0.86, 1, p) * 0.6;
    rig.rotation.x = pointer.y * 0.05;
    rig.rotation.z = -pointer.x * 0.025;

    // Camera
    const [camY, distK, lookY, skew] = sampleKeys(CAMERA_KEYS, p);
    const base = wide ? 7.4 : 11;
    camera.position.set(Math.sin(pointer.x * 0.15) * 0.4, camY, base * distK);
    look.set(0, lookY, 0);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    // Shift the subject sideways in the frame without changing perspective.
    camera.projectionMatrix.elements[8] = wide ? skew : 0;
    camera.projectionMatrix.elements[9] = wide ? 0 : smooth(0.6, 0.7, p) * (1 - smooth(0.84, 0.95, p)) * -0.35;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();

    dust.update(elapsed);
    renderer.render(scene, camera);

    // Place annotation labels on their parts. Each label sits on the side of the model its part
    // is on, and its leader line stretches until the text clears the silhouette.
    for (let i = 0; i < annotations.length; i++) {
      const a = annotations[i];
      a.part.localToWorld(world.copy(a.local));
      const y0 = world.y;
      tmp.copy(world).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      axis.set(0, y0, 0).project(camera);
      const cx = (axis.x * 0.5 + 0.5) * width;
      edge.set(0.62, y0, 0).project(camera);
      const halfWidth = Math.abs((edge.x - axis.x) * 0.5 * width);
      const dx = x - cx;
      if (Math.abs(dx) > 6) a.side = dx > 0 ? "right" : "left";
      const line = Math.min(Math.max(halfWidth + 28 - Math.abs(dx), wide ? 36 : 18), 320);
      const show = smooth(0.62 + i * 0.05, 0.8 + i * 0.05, explode);
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      a.el.style.opacity = show.toFixed(3);
      a.el.style.setProperty("--reveal", show.toFixed(3));
      a.el.style.setProperty("--line", `${line.toFixed(0)}px`);
      if (a.el.dataset.side !== a.side) a.el.dataset.side = a.side;
    }
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
// Model
// =====================================================================

function buildFountain(): Record<PartName, THREE.Group> {
  const grain = brushedTexture();
  const brushed = new THREE.MeshPhysicalMaterial({
    color: "#c9cacc",
    metalness: 1,
    roughness: 1,
    roughnessMap: grain,
    bumpMap: grain,
    bumpScale: 0.6,
  });
  const polished = new THREE.MeshPhysicalMaterial({
    color: "#e4e5e7",
    metalness: 1,
    roughness: 1,
    roughnessMap: smudgeTexture(),
  });
  const chrome = new THREE.MeshPhysicalMaterial({ color: "#f0f0f0", metalness: 1, roughness: 0.06 });
  const castSteel = new THREE.MeshPhysicalMaterial({ color: "#9a9b9e", metalness: 1, roughness: 0.48 });
  const shadowGap = new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.9 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.75 });

  const group = () => new THREE.Group();
  const parts = {
    base: group(),
    pedestal: group(),
    panel: group(),
    bowl: group(),
    drain: group(),
    bubbler: group(),
    guard: group(),
    button: group(),
  } satisfies Record<PartName, THREE.Group>;
  const add = (part: THREE.Group, mesh: THREE.Mesh, at?: [number, number, number]) => {
    if (at) mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    part.add(mesh);
    return mesh;
  };

  // --- Floor flange with four bolts ---
  add(
    parts.base,
    new THREE.Mesh(
      lathe(
        [
          [0.001, 0],
          [0.42, 0],
          [0.425, 0.012],
          [0.415, 0.04],
          [0.33, 0.052],
          [0.001, 0.052],
        ],
        128,
        false,
      ),
      castSteel,
    ),
  );
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const x = Math.cos(a) * 0.35;
    const z = Math.sin(a) * 0.35;
    add(parts.base, new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 32), chrome), [x, 0.045, z]);
    const bolt = add(parts.base, new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.026, 6), chrome), [x, 0.06, z]);
    bolt.rotation.y = a * 1.7;
  }

  // --- Pedestal: brushed tube with flared foot and a top cap ---
  add(
    parts.pedestal,
    new THREE.Mesh(
      lathe(
        [
          [0.3, 0.05],
          [0.29, 0.075],
          [0.235, 0.14],
          [0.2, 0.24],
          [0.19, 0.4],
          [0.182, 1.4],
          [0.178, 1.95],
          [0.19, 1.975],
          [0.19, 2.02],
          [0.001, 2.03],
        ],
        160,
      ),
      brushed,
    ),
  );
  // Data plate on the back
  const plate = add(
    parts.pedestal,
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.1865, 0.1865, 0.13, 32, 1, true, Math.PI - 0.42, 0.84),
      new THREE.MeshPhysicalMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.42 }),
    ),
    [0, 0.6, 0],
  );
  plate.castShadow = false;

  // --- Access panel on the front, with a dark shadow gap and four screws ---
  const panelArc = 0.95;
  const panelStart = -panelArc / 2; // centered on +z
  add(
    parts.pedestal,
    new THREE.Mesh(new THREE.CylinderGeometry(0.1835, 0.1835, 0.6, 48, 1, true, panelStart - 0.03, panelArc + 0.06), shadowGap),
    [0, 1.12, 0],
  );
  add(
    parts.panel,
    new THREE.Mesh(new THREE.CylinderGeometry(0.1865, 0.1865, 0.585, 48, 1, true, panelStart, panelArc), brushed),
    [0, 1.12, 0],
  );
  for (const [ay, ax] of [
    [1.38, -0.36],
    [1.38, 0.36],
    [0.86, -0.36],
    [0.86, 0.36],
  ]) {
    const screw = add(parts.panel, new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), chrome));
    screw.position.set(Math.sin(ax) * 0.187, ay, Math.cos(ax) * 0.187);
    screw.lookAt(screw.position.clone().multiplyScalar(2).setY(ay));
    screw.rotateX(Math.PI / 2);
  }

  // --- Bowl: polished, rolled rim, skirt down to the pedestal ---
  add(
    parts.bowl,
    new THREE.Mesh(
      lathe(
        [
          [0.19, 1.99],
          [0.24, 2.0],
          [0.36, 2.06],
          [0.455, 2.14],
          [0.5, 2.21],
          [0.515, 2.252],
          [0.512, 2.276],
          [0.497, 2.284],
          [0.483, 2.27],
          [0.45, 2.21],
          [0.36, 2.15],
          [0.24, 2.115],
          [0.12, 2.1],
          [0.06, 2.097],
          [0.001, 2.096],
        ],
        180,
      ),
      polished,
    ),
  );

  // --- Strainer: dark drain with radial slots ---
  add(parts.drain, new THREE.Mesh(new THREE.CircleGeometry(0.052, 48).rotateX(-Math.PI / 2), shadowGap), [0, 2.099, 0]);
  add(parts.drain, new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.006, 10, 48).rotateX(Math.PI / 2), chrome), [0, 2.1, 0]);
  for (let i = 0; i < 6; i++) {
    const bar = add(parts.drain, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.008), chrome), [0, 2.101, 0]);
    bar.rotation.y = (i * Math.PI) / 6;
  }

  // --- Bubbler: shank, domed head, orifice ---
  add(parts.bubbler, new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.036, 0.11, 40), chrome), [-0.3, 2.175, 0]);
  add(parts.bubbler, new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.01, 40), chrome), [-0.3, 2.13, 0]);
  const head = add(parts.bubbler, new THREE.Mesh(new THREE.SphereGeometry(0.042, 48, 24), chrome), [-0.296, 2.238, 0]);
  head.scale.set(1.15, 0.72, 1);
  const orifice = add(parts.bubbler, new THREE.Mesh(new THREE.CircleGeometry(0.008, 24), shadowGap));
  orifice.position.copy(NOZZLE).add(new THREE.Vector3(-0.003, -0.002, 0));
  orifice.lookAt(orifice.position.clone().add(new THREE.Vector3(0.6, 1, 0)));

  // --- Guard: bent rod arching over the bubbler ---
  const guardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.37, 2.13, -0.075),
    new THREE.Vector3(-0.37, 2.25, -0.07),
    new THREE.Vector3(-0.35, 2.31, 0),
    new THREE.Vector3(-0.37, 2.25, 0.07),
    new THREE.Vector3(-0.37, 2.13, 0.075),
  ]);
  add(parts.guard, new THREE.Mesh(new THREE.TubeGeometry(guardCurve, 80, 0.0085, 14), chrome));

  // --- Push button on the front of the bowl ---
  const buttonAt = (z: number) => [0, 2.17, z] as [number, number, number];
  add(parts.button, new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.072, 0.07, 48).rotateX(Math.PI / 2), polished), buttonAt(0.47));
  add(parts.button, new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.007, 12, 48), rubber), buttonAt(0.505));
  add(parts.button, new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.022, 48).rotateX(Math.PI / 2), chrome), buttonAt(0.512));

  return parts;
}

function buildWater(uTime: { value: number }, uOn: { value: number }) {
  const group = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(NOZZLE, new THREE.Vector3(-0.07, 2.53, 0), IMPACT);
  const TUBE_SEGMENTS = 160;
  const RADIAL = 16;

  // Clear water body: refraction + reflections, no color.
  const bodyGeo = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.015, RADIAL);
  const body = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      thickness: 0.03,
      ior: 1.33,
      envMapIntensity: 2.2,
    }),
  );
  group.add(body);

  // Moving highlights riding the surface of the stream.
  const sheenGeo = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.0158, RADIAL);
  const sheen = new THREE.Mesh(
    sheenGeo,
    new THREE.ShaderMaterial({
      uniforms: { uTime, uOn },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vUv = uv;
          vec3 p = position + normal * 0.0012 * sin(uv.x * 90.0 - uTime * 30.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vV = -mv.xyz;
          vN = normalMatrix * normal;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOn;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float fr = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 3.0);
          float streak = pow(max(sin(vUv.x * 46.0 - uTime * 20.0 + sin(vUv.y * 6.2831) * 0.6), 0.0), 10.0);
          float a = (0.08 + fr * 0.9 + streak * 0.55) * smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x);
          gl_FragColor = vec4(vec3(1.0), a * uOn);
        }
      `,
    }),
  );
  group.add(sheen);

  // Ripples in the film of water around the landing point.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(0.27, 96),
    new THREE.ShaderMaterial({
      uniforms: { uTime, uOn, uImpact: { value: new THREE.Vector2(IMPACT.x, -IMPACT.z) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOn;
        uniform vec2 uImpact;
        varying vec2 vP;
        void main() {
          float d = length(vP - uImpact);
          float rip = pow(max(sin(d * 110.0 - uTime * 12.0) * 0.5 + 0.5, 0.0), 6.0) * exp(-d * 9.0);
          float edge = smoothstep(0.27, 0.12, length(vP));
          gl_FragColor = vec4(vec3(1.0), (rip * 0.4 + exp(-d * 40.0) * 0.25) * edge * uOn);
        }
      `,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = POOL_Y;
  group.add(pool);

  // Fine splash at the landing point.
  const COUNT = 70;
  const positions = new Float32Array(COUNT * 3);
  const alphas = new Float32Array(COUNT);
  const seeds = Array.from({ length: COUNT }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
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
          gl_PointSize = uScale * 18.0 / -mv.z;
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

  const fullCount = bodyGeo.index!.count;
  const update = (t: number, on: number) => {
    // The stream grows out of the nozzle as the water turns on.
    const n = Math.floor((fullCount * on) / (RADIAL * 6)) * RADIAL * 6;
    bodyGeo.setDrawRange(0, n);
    sheenGeo.setDrawRange(0, n);
    group.visible = on > 0.001;
    const landed = on > 0.98 ? 1 : 0;
    for (let i = 0; i < COUNT; i++) {
      const [a, b, c, d] = seeds[i];
      const life = 0.35 + b * 0.35;
      const age = ((a + t / life) % 1) * life;
      const angle = c * Math.PI * 2;
      const out = 0.15 + d * 0.3;
      const y = IMPACT.y + (0.35 + b * 0.5) * age - 2.4 * age * age;
      positions[i * 3] = IMPACT.x + Math.cos(angle) * out * age + 0.03 * age;
      positions[i * 3 + 1] = Math.max(y, POOL_Y);
      positions[i * 3 + 2] = IMPACT.z + Math.sin(angle) * out * age;
      alphas[i] = y < POOL_Y ? 0 : (1 - age / life) * 0.7 * landed;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  };
  return { group, update };
}

// =====================================================================
// Atmosphere
// =====================================================================

function buildLightCone() {
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 1.9, 8, 96, 1, true),
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
          // Brightest where we look through the most "air": facing the camera, near the top.
          float facing = pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.0);
          float a = facing * pow(vUv.y, 1.4) * 0.07 * smoothstep(0.0, 0.25, vUv.y);
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `,
    }),
  );
  cone.position.set(0.12, 2.6, 0.2);
  cone.rotation.z = -0.1;
  return cone;
}

function buildDust() {
  const COUNT = 520;
  const base = new Float32Array(COUNT * 3);
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = Math.sqrt(Math.random()) * 2.2;
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
          float coneR = mix(1.9, 0.12, clamp((position.y + 1.4) / 8.0, 0.0, 1.0));
          vLit = smoothstep(coneR, coneR * 0.4, r);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale * 14.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLit;
        void main() {
          float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vLit * 0.5;
          gl_FragColor = vec4(vec3(1.0), a);
        }
      `,
    }),
  );
  points.frustumCulled = false;
  const update = (t: number) => {
    for (let i = 0; i < COUNT; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];
      const y = ((by + t * 0.04 + 2.5) % 6) - 2.5;
      positions[i * 3] = bx + Math.sin(t * 0.21 + i) * 0.06;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = bz + Math.cos(t * 0.17 + i * 1.3) * 0.06;
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
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(9, 9, 2.6, [0, 10, 0]); // overhead softbox
  panel(4, 11, 2.2, [-6, 1, 3]); // big left softbox
  panel(1.5, 12, 1.7, [6, 1, 1]); // right strip
  panel(2.5, 10, 1.9, [2, 1, -8]); // back rim strip
  panel(3, 5, 1.2, [-3, 2, 7]); // front-left key
  panel(10, 0.35, 3.2, [0, 4, 6]); // thin horizontal strip: crisp line on the bowl
  panel(20, 20, 0.35, [0, -6, 0]); // floor bounce
  return env;
}

// =====================================================================
// Helpers
// =====================================================================

function lathe(profile: number[][], segments: number, smoothProfile = true) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const outline = smoothProfile ? new THREE.SplineCurve(pts).getPoints(profile.length * 14) : pts;
  return new THREE.LatheGeometry(outline, segments);
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function sampleKeys(keys: number[][], p: number): number[] {
  if (p <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const a = keys[i - 1];
      const b = keys[i];
      const t = smooth(a[0], b[0], p);
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * t);
    }
  }
  return keys[keys.length - 1].slice(1);
}

// Vertical grain for brushed steel (used as both roughness and bump).
function brushedTexture() {
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
  tex.repeat.set(2, 1);
  tex.anisotropy = 8;
  return tex;
}

// Fingerprints and dried water spots: low roughness with soft blotches.
function smudgeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgb(22,22,22)";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 6 + Math.random() ** 2 * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = 40 + Math.random() * 50;
    g.addColorStop(0, `rgba(${v},${v},${v},0.8)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

// Engraved data plate.
function plateTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#8d8e90";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 484, 228);
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "600 40px ui-monospace, Menlo, monospace";
  ctx.fillText("BOILER FOUNTAINS", 40, 80);
  ctx.font = "26px ui-monospace, Menlo, monospace";
  ctx.fillText("MODEL PF-01   115V 60HZ", 40, 135);
  ctx.fillText("CHILLED (ALLEGEDLY)", 40, 175);
  ctx.fillText("SER. 0000001", 40, 215);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
