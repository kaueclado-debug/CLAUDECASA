// Personagens, modelos 3D dos karts, poderes e partículas.
const RACERS = [
  { name: 'Tito', color: '#e53935', accent: '#ffeb3b', skin: '#f1c27d' },
  { name: 'Lola', color: '#8e24aa', accent: '#f8bbd0', skin: '#e0ac69' },
  { name: 'Bruno', color: '#1e88e5', accent: '#ffffff', skin: '#c68642' },
  { name: 'Mia', color: '#f06292', accent: '#ffffff', skin: '#f1c27d' },
  { name: 'Zeca', color: '#43a047', accent: '#fff176', skin: '#8d5524' },
  { name: 'Nina', color: '#ffb300', accent: '#6d4c41', skin: '#ffdbac' },
  { name: 'Duda', color: '#00acc1', accent: '#ff7043', skin: '#e0ac69' },
  { name: 'Theo', color: '#6d4c41', accent: '#ffcc80', skin: '#c68642' },
  { name: 'Bia', color: '#ff7043', accent: '#4fc3f7', skin: '#ffdbac' },
  { name: 'Kiko', color: '#3949ab', accent: '#ffd54f', skin: '#8d5524' },
  { name: 'Lulu', color: '#c0ca33', accent: '#7b1fa2', skin: '#f1c27d' },
  { name: 'Rex', color: '#424242', accent: '#ff1744', skin: '#e0ac69' },
];
const PLAYER_COLORS = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502'];

const ITEMS = {
  mushroom: { name: 'Turbo', icon: '🍄' },
  triple: { name: 'Turbo Triplo', icon: '🍄' },
  green: { name: 'Casco Verde', icon: '🟢' },
  red: { name: 'Casco Vermelho', icon: '🔴' },
  banana: { name: 'Banana', icon: '🍌' },
  star: { name: 'Estrela', icon: '⭐' },
  lightning: { name: 'Raio', icon: '⚡' },
  bomb: { name: 'Bomba', icon: '💣' },
  ink: { name: 'Tinta', icon: '🦑' },
};
const ITEM_KEYS = Object.keys(ITEMS);

const Models = (() => {
  const shared = {};
  function geo(key, make) { return shared[key] || (shared[key] = make()); }
  const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

  function kart(racer) {
    const root = new THREE.Group();
    const tilt = new THREE.Group(); root.add(tilt);
    const body = new THREE.Group(); tilt.add(body);
    const paint = lam(racer.color, { emissive: 0x000000 });
    const accent = lam(racer.accent);
    const dark = lam(0x222228);
    const metal = lam(0x9e9e9e);

    const chassis = new THREE.Mesh(geo('chassis', () => new THREE.BoxGeometry(1.8, 0.45, 2.7)), paint);
    chassis.position.y = 0.55; body.add(chassis);
    const nose = new THREE.Mesh(geo('nose', () => new THREE.BoxGeometry(1.3, 0.38, 0.9)), paint);
    nose.position.set(0, 0.5, 1.6); body.add(nose);
    const bumper = new THREE.Mesh(geo('bumper', () => new THREE.BoxGeometry(1.9, 0.25, 0.3)), accent);
    bumper.position.set(0, 0.4, 2.05); body.add(bumper);
    const side = new THREE.Mesh(geo('side', () => new THREE.BoxGeometry(2.1, 0.22, 1.4)), dark);
    side.position.set(0, 0.45, 0); body.add(side);
    const seat = new THREE.Mesh(geo('seat', () => new THREE.BoxGeometry(1.0, 0.9, 0.3)), dark);
    seat.position.set(0, 1.1, -0.75); body.add(seat);
    const spoilerPost = new THREE.Mesh(geo('spost', () => new THREE.BoxGeometry(0.15, 0.6, 0.15)), dark);
    spoilerPost.position.set(0, 1.0, -1.3); body.add(spoilerPost);
    const spoiler = new THREE.Mesh(geo('spoiler', () => new THREE.BoxGeometry(1.9, 0.12, 0.55)), accent);
    spoiler.position.set(0, 1.3, -1.35); body.add(spoiler);
    const wheelAnchor = new THREE.Mesh(geo('steer', () => new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6)), dark);
    wheelAnchor.position.set(0, 1.1, 0.55); wheelAnchor.rotation.x = -0.6; body.add(wheelAnchor);
    const sw = new THREE.Mesh(geo('sw', () => new THREE.TorusGeometry(0.28, 0.06, 6, 12)), dark);
    sw.position.set(0, 1.35, 0.4); sw.rotation.x = -0.9; body.add(sw);

    // piloto
    const torso = new THREE.Mesh(geo('torso', () => new THREE.CylinderGeometry(0.38, 0.45, 0.9, 10)), accent);
    torso.position.set(0, 1.25, -0.25); body.add(torso);
    const head = new THREE.Mesh(geo('head', () => new THREE.SphereGeometry(0.42, 14, 10)), lam(racer.skin));
    head.position.set(0, 2.0, -0.2); body.add(head);
    const helmet = new THREE.Mesh(geo('helmet', () => new THREE.SphereGeometry(0.47, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.9)), paint);
    helmet.position.set(0, 2.05, -0.25); helmet.rotation.x = -0.25; body.add(helmet);
    const visor = new THREE.Mesh(geo('visor', () => new THREE.BoxGeometry(0.6, 0.14, 0.12)), lam(0x111111));
    visor.position.set(0, 2.08, 0.18); body.add(visor);

    // rodas
    const wheelGeo = geo('wheel', () => { const g = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 14); g.rotateZ(Math.PI / 2); return g; });
    const hubGeo = geo('hub', () => { const g = new THREE.CylinderGeometry(0.2, 0.2, 0.44, 8); g.rotateZ(Math.PI / 2); return g; });
    const wheels = [], steerers = [];
    for (const [x, z, front] of [[-1.05, 1.05, true], [1.05, 1.05, true], [-1.1, -0.95, false], [1.1, -0.95, false]]) {
      const steer = new THREE.Group(); steer.position.set(x, 0.46, z); body.add(steer);
      const roll = new THREE.Group(); steer.add(roll);
      const w = new THREE.Mesh(wheelGeo, dark); roll.add(w);
      const h = new THREE.Mesh(hubGeo, metal); roll.add(h);
      if (!front) { w.scale.set(1.15, 1.08, 1.08); }
      wheels.push(roll); if (front) steerers.push(steer);
    }
    // escapamento + chamas
    const flames = [];
    for (const x of [-0.45, 0.45]) {
      const pipe = new THREE.Mesh(geo('pipe', () => { const g = new THREE.CylinderGeometry(0.13, 0.13, 0.5, 8); g.rotateX(Math.PI / 2); return g; }), metal);
      pipe.position.set(x, 0.6, -1.45); body.add(pipe);
      const f = new THREE.Mesh(geo('flame', () => { const g = new THREE.ConeGeometry(0.22, 1.1, 8); g.rotateX(-Math.PI / 2); g.translate(0, 0, -0.55); return g; }), new THREE.MeshBasicMaterial({ color: 0xff9a1a, transparent: true, opacity: 0.85 }));
      f.position.set(x, 0.6, -1.7); f.visible = false; body.add(f);
      flames.push(f);
    }
    return { root, tilt, body, wheels, steerers, flames, paint };
  }

  function shadow() {
    const tex = shared.shadowTex || (shared.shadowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })());
    const m = new THREE.Mesh(geo('shadow', () => { const g = new THREE.PlaneGeometry(2.8, 3.6); g.rotateX(-Math.PI / 2); return g; }), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    return m;
  }

  function label(text, color) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = color; g.beginPath(); g.roundRect ? g.roundRect(14, 4, 100, 40, 12) : g.rect(14, 4, 100, 40); g.fill();
    g.beginPath(); g.moveTo(52, 44); g.lineTo(76, 44); g.lineTo(64, 60); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 64, 25);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(1.7, 0.85, 1);
    s.renderOrder = 10;
    return s;
  }

  function shell(color) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(geo('shellTop', () => new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), lam(color, { emissive: color, emissiveIntensity: 0.25 }));
    const rim = new THREE.Mesh(geo('shellRim', () => { const t = new THREE.TorusGeometry(0.62, 0.14, 6, 16); t.rotateX(Math.PI / 2); return t; }), lam(0xffffff));
    const base = new THREE.Mesh(geo('shellBase', () => new THREE.SphereGeometry(0.6, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), lam(0xfff3c4));
    g.add(top, rim, base);
    return g;
  }
  function banana() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(geo('banana', () => new THREE.TorusGeometry(0.55, 0.2, 6, 12, Math.PI * 1.1)), lam(0xffe135, { emissive: 0x443300 }));
    b.rotation.z = Math.PI * 0.95; b.position.y = 0.55;
    const tip = new THREE.Mesh(geo('btip', () => new THREE.CylinderGeometry(0.06, 0.08, 0.25, 5)), lam(0x5d4037));
    tip.position.set(0.55, 0.6, 0);
    g.add(b, tip);
    return g;
  }
  function bomb() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(geo('bomb', () => new THREE.SphereGeometry(0.75, 14, 10)), lam(0x1a1a1a, { emissive: 0x220000 }));
    const fuse = new THREE.Mesh(geo('fuse', () => new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5)), lam(0xc8a165));
    fuse.position.y = 0.9;
    const spark = new THREE.Mesh(geo('spark', () => new THREE.SphereGeometry(0.16, 6, 4)), new THREE.MeshBasicMaterial({ color: 0xffdd33 }));
    spark.position.y = 1.18;
    g.add(b, fuse, spark);
    g.userData.body = b;
    return g;
  }
  function explosion() {
    return new THREE.Mesh(geo('boom', () => new THREE.SphereGeometry(1, 16, 12)), new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.8, depthWrite: false }));
  }
  return { kart, shadow, label, shell, banana, bomb, explosion };
})();

// Sistema de partículas simples (pontos com mistura aditiva).
class Particles {
  constructor(scene, max = 2000) {
    this.max = max; this.n = 0;
    this.d = { px: new Float32Array(max), py: new Float32Array(max), pz: new Float32Array(max), vx: new Float32Array(max), vy: new Float32Array(max), vz: new Float32Array(max), life: new Float32Array(max), max: new Float32Array(max), r: new Float32Array(max), g: new Float32Array(max), b: new Float32Array(max), grav: new Float32Array(max) };
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    this.tex = new THREE.CanvasTexture(c);
    this.mat = new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: this.tex });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(x, y, z, vx, vy, vz, color, life = 0.5, grav = 0) {
    if (this.n >= this.max) return;
    const i = this.n++, d = this.d;
    d.px[i] = x; d.py[i] = y; d.pz[i] = z; d.vx[i] = vx; d.vy[i] = vy; d.vz[i] = vz;
    d.life[i] = d.max[i] = life; d.r[i] = color.r; d.g[i] = color.g; d.b[i] = color.b; d.grav[i] = grav;
  }
  update(dt) {
    const d = this.d;
    let j = 0;
    for (let i = 0; i < this.n; i++) {
      d.life[i] -= dt;
      if (d.life[i] <= 0) continue;
      if (j !== i) for (const k in d) d[k][j] = d[k][i];
      d.vy[j] -= d.grav[j] * dt;
      d.px[j] += d.vx[j] * dt; d.py[j] += d.vy[j] * dt; d.pz[j] += d.vz[j] * dt;
      const f = d.life[j] / d.max[j];
      this.pos[j * 3] = d.px[j]; this.pos[j * 3 + 1] = d.py[j]; this.pos[j * 3 + 2] = d.pz[j];
      this.col[j * 3] = d.r[j] * f; this.col[j * 3 + 1] = d.g[j] * f; this.col[j * 3 + 2] = d.b[j] * f;
      j++;
    }
    this.n = j;
    this.geo.setDrawRange(0, j);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
  dispose(scene) { scene.remove(this.points); this.geo.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
