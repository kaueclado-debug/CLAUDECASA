// Definição e construção das pistas.
const THEMES = {
  grass: {
    sky: 0x8fd3ff, fog: 0xa8dcff, fogFar: 700, ground: '#56b04d', off: '#6cc35a', offMult: 0.55, grip: 9,
    road: '#55565c', line: '#ffffff', curbA: '#e53935', curbB: '#ffffff', wallA: '#ffffff', wallB: '#e53935',
    embank: '#5aa84d', scenery: 'grass', hemi: [0xffffff, 0x4c8a3c, 1.0], sun: 0.9,
  },
  desert: {
    sky: 0xffcf8a, fog: 0xf7c98a, fogFar: 650, ground: '#e7c07a', off: '#d9a75a', offMult: 0.45, grip: 8.5,
    road: '#8a6f5a', line: '#fff3d6', curbA: '#ff8f00', curbB: '#fff3d6', wallA: '#a0522d', wallB: '#d2884f',
    embank: '#d8aa64', scenery: 'desert', hemi: [0xfff1d6, 0xb07a3c, 1.0], sun: 1.0,
  },
  snow: {
    sky: 0xbcd8f2, fog: 0xdcebf8, fogFar: 550, ground: '#f3f7fc', off: '#e2ebf5', offMult: 0.6, grip: 4.5,
    road: '#5d7086', line: '#e8f6ff', curbA: '#1e88e5', curbB: '#ffffff', wallA: '#b3e5fc', wallB: '#ffffff',
    embank: '#e9f0f8', scenery: 'snow', hemi: [0xffffff, 0x9fb7d0, 1.0], sun: 0.8,
  },
  neon: {
    sky: 0x080320, fog: 0x14093a, fogFar: 600, ground: '#120a2c', off: '#22134a', offMult: 0.6, grip: 9,
    road: '#1b1636', line: '#00f0ff', curbA: '#ff2bd6', curbB: '#00f0ff', wallA: '#ff2bd6', wallB: '#00f0ff',
    embank: '#1b1040', scenery: 'neon', hemi: [0x9f8cff, 0x200a40, 0.9], sun: 0.4, night: true,
  },
  beach: {
    sky: 0x7fd8ff, fog: 0xa6e6ff, fogFar: 700, ground: '#f2dc9b', off: '#f0d48a', offMult: 0.5, grip: 8.8,
    road: '#6b6f78', line: '#ffffff', curbA: '#00bcd4', curbB: '#ffffff', wallA: '#ffffff', wallB: '#00acc1',
    embank: '#efd58f', scenery: 'beach', hemi: [0xffffff, 0x5fb3c9, 1.0], sun: 1.0,
  },
};

function figure8(n, t0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = t0 + (i / n) * Math.PI * 2;
    pts.push([200 * Math.sin(t), 135 * Math.sin(2 * t), 6.5 + 6.5 * Math.cos(t)]);
  }
  return pts;
}

const TRACK_DEFS = [
  {
    name: 'Vale Cogumelo', desc: 'Colinas verdes e curvas suaves. Ideal para começar.', theme: 'grass', scale: 1.35,
    pts: [[0, -150, 0], [0, -50, 0], [8, 40, 2], [50, 100, 5], [120, 112, 6], [172, 70, 4], [162, 0, 1], [110, -30, 0], [98, -90, 1], [140, -140, 3], [122, -200, 3], [52, -222, 1], [5, -205, 0]],
    boxes: [0.1, 0.33, 0.58, 0.82], pads: [[0.24, 0], [0.47, -4], [0.72, 4]],
  },
  {
    name: 'Dunas do Sol', desc: 'Retas longas, grampos fechados e areia que segura.', theme: 'desert', scale: 1.3,
    pts: [[0, -120, 0], [0, 0, 0], [0, 80, 1], [40, 150, 3], [120, 172, 5], [200, 160, 4], [255, 110, 2], [265, 30, 0], [255, -50, 0], [215, -92, 0], [173, -62, 0], [165, 10, 1], [130, 45, 1], [96, 10, 0], [90, -80, 0], [62, -160, 0], [15, -172, 0]],
    boxes: [0.06, 0.3, 0.55, 0.8], pads: [[0.13, 3], [0.13, -3], [0.62, 0], [0.92, 0]],
  },
  {
    name: 'Pico Gelado', desc: 'Subida na montanha com gelo escorregadio.', theme: 'snow', scale: 1.3,
    pts: [[0, -140, 0], [0, -20, 3], [-20, 70, 9], [-80, 122, 15], [-160, 102, 19], [-192, 30, 17], [-152, -30, 13], [-92, -30, 10], [-72, -92, 7], [-112, -152, 5], [-82, -212, 3], [-22, -222, 1], [22, -192, 0]],
    boxes: [0.08, 0.32, 0.56, 0.8], pads: [[0.2, 0], [0.5, 3], [0.88, -3]],
  },
  {
    name: 'Neon Noturno', desc: 'Oito com viaduto iluminado no meio da cidade.', theme: 'neon', scale: 1,
    pts: figure8(28, Math.PI + 0.32),
    boxes: [0.12, 0.37, 0.62, 0.87], pads: [[0.25, 0], [0.5, 4], [0.75, -4]], noSkirt: true,
  },
  {
    name: 'Praia Coral', desc: 'Orla ensolarada cheia de curvas em S.', theme: 'beach', scale: 1.3,
    pts: [[0, -130, 0], [0, -30, 0], [-15, 50, 1], [20, 110, 2], [90, 120, 3], [130, 75, 2], [110, 20, 1], [150, -20, 1], [210, -10, 2], [245, -60, 1], [215, -130, 0], [150, -150, 0], [100, -110, 0], [55, -170, 0], [15, -185, 0]],
    boxes: [0.1, 0.34, 0.6, 0.84], pads: [[0.28, 0], [0.55, -3], [0.9, 3]],
  },
];

// ---------- utilidades de textura ----------
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function speckle(g, w, h, base, amount = 0.12, n = 1400, size = 3) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * amount})`;
    g.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}
function seeded(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const Tracks = {
  defs: TRACK_DEFS,

  curveOf(def) {
    const pts = def.pts.map((p) => new THREE.Vector3(p[0] * def.scale, p[2], p[1] * def.scale));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  },

  preview(i, n = 200) {
    const curve = this.curveOf(TRACK_DEFS[i]);
    return curve.getSpacedPoints(n).map((p) => [p.x, p.z]);
  },

  build(index, scene) {
    const def = TRACK_DEFS[index];
    const th = THEMES[def.theme];
    const curve = this.curveOf(def);
    const length = curve.getLength();
    const N = Math.floor(length / 1.0);
    const spacing = length / N;
    const P = [], T = [], L = [], slope = [];
    const sp = curve.getSpacedPoints(N);
    for (let i = 0; i < N; i++) {
      P.push(sp[i].clone());
      const t = curve.getTangentAt(i / N).normalize();
      T.push(t);
      L.push(new THREE.Vector3(t.z, 0, -t.x).normalize());
      slope.push(t.y / Math.max(0.2, Math.hypot(t.x, t.z)));
    }
    // suaviza tangentes planas para evitar ruído
    const W = 10, O = 6;
    const tr = { def, theme: th, index, N, spacing, length, P, T, L, slope, W, O, group: new THREE.Group(), boxes: [], boxRows: [], pads: [], disposables: [] };
    scene.add(tr.group);

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    tr.bounds = { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, size: Math.max(maxX - minX, maxZ - minZ) };

    // céu, neblina e luzes
    scene.background = new THREE.Color(th.sky);
    scene.fog = new THREE.Fog(th.fog, 120, th.fogFar);
    const hemi = new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]);
    tr.group.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, th.sun);
    sun.position.set(0.4, 1, 0.3);
    tr.group.add(sun);
    if (th.night) tr.group.add(new THREE.AmbientLight(0x6040ff, 0.35));

    this._buildRoad(tr, def);
    this._buildGround(tr);
    this._buildStart(tr);
    this._buildBoxes(tr, def);
    this._buildPads(tr, def);
    this._buildScenery(tr, def);
    return tr;
  },

  _tex(tr, t) { tr.disposables.push(t); return t; },

  // Gera uma fita ao longo da pista. fn(i) => [ladoA(Vector3), ladoB(Vector3)]
  _ribbon(tr, fn, mat, vLen = 16) {
    const N = tr.N;
    const pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2);
    const idx = [];
    for (let i = 0; i <= N; i++) {
      const [a, b] = fn(i % N);
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      const v = (i * tr.spacing) / vLen;
      uv.set([0, v, 1, v], i * 4);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    tr.group.add(m);
    return m;
  },

  _buildRoad(tr, def) {
    const th = tr.theme, { P, L, W, O } = tr;
    const side = THREE.DoubleSide;
    const night = !!th.night;
    const roadTex = this._tex(tr, canvasTex(256, 256, (g, w, h) => {
      speckle(g, w, h, th.road, night ? 0.05 : 0.1, 2500, 2);
      g.fillStyle = th.line;
      g.fillRect(4, 0, 6, h); g.fillRect(w - 10, 0, 6, h);
      g.fillRect(w / 2 - 3, 0, 6, h / 2);
      if (night) { g.fillStyle = 'rgba(255,43,214,0.35)'; g.fillRect(w / 4, 0, 2, h); g.fillRect((w * 3) / 4, 0, 2, h); }
    }));
    const roadMat = night
      ? new THREE.MeshLambertMaterial({ map: roadTex, side, emissive: 0xffffff, emissiveMap: roadTex, emissiveIntensity: 0.55 })
      : new THREE.MeshLambertMaterial({ map: roadTex, side });
    this._ribbon(tr, (i) => [P[i].clone().addScaledVector(L[i], -W).setY(P[i].y + 0.03), P[i].clone().addScaledVector(L[i], W).setY(P[i].y + 0.03)], roadMat, 16);

    const curbTex = this._tex(tr, canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = th.curbA; g.fillRect(0, 0, w, h / 2); g.fillStyle = th.curbB; g.fillRect(0, h / 2, w, h / 2);
    }));
    const curbMat = new THREE.MeshLambertMaterial({ map: curbTex, side, emissive: night ? 0xffffff : 0x000000, emissiveMap: night ? curbTex : null, emissiveIntensity: 0.6 });
    for (const s of [-1, 1]) {
      this._ribbon(tr, (i) => [P[i].clone().addScaledVector(L[i], s * W).setY(P[i].y + 0.05), P[i].clone().addScaledVector(L[i], s * (W + 1.3)).setY(P[i].y + 0.05)], curbMat, 4);
    }
    const offTex = this._tex(tr, canvasTex(128, 128, (g, w, h) => speckle(g, w, h, th.off, 0.15, 900, 3)));
    const offMat = new THREE.MeshLambertMaterial({ map: offTex, side });
    for (const s of [-1, 1]) {
      this._ribbon(tr, (i) => [P[i].clone().addScaledVector(L[i], s * (W + 1.3)).setY(P[i].y + 0.02), P[i].clone().addScaledVector(L[i], s * (W + O)).setY(P[i].y + 0.02)], offMat, 8);
    }
    // muros
    const wallTex = this._tex(tr, canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = th.wallA; g.fillRect(0, 0, w / 2, h); g.fillStyle = th.wallB; g.fillRect(w / 2, 0, w / 2, h);
    }));
    const wallMat = night
      ? new THREE.MeshBasicMaterial({ map: wallTex, side })
      : new THREE.MeshLambertMaterial({ map: wallTex, side });
    for (const s of [-1, 1]) {
      this._ribbon(tr, (i) => {
        const b = P[i].clone().addScaledVector(L[i], s * (W + O));
        return [b.clone().setY(P[i].y), b.clone().setY(P[i].y + 1.3)];
      }, wallMat, 6);
    }
    if (!def.noSkirt) {
      const embTex = this._tex(tr, canvasTex(128, 128, (g, w, h) => speckle(g, w, h, th.embank, 0.12, 700, 4)));
      const embMat = new THREE.MeshLambertMaterial({ map: embTex, side });
      for (const s of [-1, 1]) {
        this._ribbon(tr, (i) => {
          const a = P[i].clone().addScaledVector(L[i], s * (W + O)).setY(P[i].y);
          const b = P[i].clone().addScaledVector(L[i], s * (W + O + 0.6 + P[i].y * 1.7)).setY(-0.2);
          return [a, b];
        }, embMat, 8);
      }
    } else {
      // pilares e laterais do viaduto
      const pilMat = new THREE.MeshLambertMaterial({ color: 0x3a2a6a, emissive: 0x2a1060 });
      const pilGeo = new THREE.BoxGeometry(2.2, 1, 2.2);
      tr.disposables.push(pilGeo);
      for (let i = 0; i < tr.N; i += 18) {
        const p = P[i]; if (p.y < 2) continue;
        for (const s of [-1, 1]) {
          const c = p.clone().addScaledVector(L[i], s * (W + O - 1));
          let blocked = false;
          for (let j = 0; j < tr.N; j += 2) {
            const q = P[j]; if (q.y > p.y - 4) continue;
            if ((q.x - c.x) ** 2 + (q.z - c.z) ** 2 < (W + O + 3) ** 2) { blocked = true; break; }
          }
          if (blocked) continue;
          const m = new THREE.Mesh(pilGeo, pilMat);
          m.scale.y = p.y; m.position.set(c.x, p.y / 2 - 0.1, c.z);
          tr.group.add(m);
        }
      }
      const sideMat = new THREE.MeshLambertMaterial({ color: 0x2a1a50, side });
      for (const s of [-1, 1]) {
        this._ribbon(tr, (i) => {
          const b = P[i].clone().addScaledVector(L[i], s * (W + O));
          return [b.clone().setY(P[i].y), b.clone().setY(P[i].y - 1.2)];
        }, sideMat, 8);
      }
      // faixa de luz embaixo do muro
      const glow = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side });
      for (const s of [-1, 1]) {
        this._ribbon(tr, (i) => {
          const b = P[i].clone().addScaledVector(L[i], s * (W + O + 0.05));
          return [b.clone().setY(P[i].y - 0.2), b.clone().setY(P[i].y - 0.5)];
        }, glow, 8);
      }
    }
  },

  _buildGround(tr) {
    const th = tr.theme;
    const tex = this._tex(tr, canvasTex(256, 256, (g, w, h) => {
      speckle(g, w, h, th.ground, 0.12, 2500, 3);
      if (th.night) {
        g.strokeStyle = 'rgba(160,80,255,0.55)'; g.lineWidth = 2;
        g.strokeRect(0, 0, w, h);
      }
    }));
    tex.repeat.set(140, 140);
    const geo = new THREE.PlaneGeometry(4000, 4000);
    tr.disposables.push(geo);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2; m.position.set(tr.bounds.cx, -0.25, tr.bounds.cz);
    tr.group.add(m);
    if (tr.def.theme === 'beach') {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 2000), new THREE.MeshLambertMaterial({ color: 0x1fa3d6, transparent: true, opacity: 0.92 }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(tr.bounds.cx, -0.15, tr.bounds.maxZ + 80 + 1000);
      tr.group.add(sea);
      tr.disposables.push(sea.geometry);
    }
  },

  _buildStart(tr) {
    const { P, L, T, W } = tr;
    const tex = this._tex(tr, canvasTex(64, 16, (g, w, h) => {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 4, y * 4, 4, 4); }
    }, false));
    tex.magFilter = THREE.NearestFilter;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2.5), new THREE.MeshLambertMaterial({ map: tex }));
    line.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.copy(P[0]).setY(P[0].y + 0.06);
    holder.rotation.y = Math.atan2(T[0].x, T[0].z);
    holder.add(line);
    // pórtico
    const postMat = new THREE.MeshLambertMaterial({ color: 0x333344 });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 0.8), postMat);
      post.position.set(s * (W + 2), 4.5, 0);
      holder.add(post);
    }
    const bannerTex = this._tex(tr, canvasTex(512, 64, (g, w, h) => {
      for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); }
      g.fillStyle = 'rgba(229,57,53,0.92)'; g.fillRect(140, 6, 232, 52);
      g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('LARGADA', 256, 34);
    }, false));
    const banner = new THREE.Mesh(new THREE.BoxGeometry(W * 2 + 4.8, 2.2, 0.5), new THREE.MeshLambertMaterial({ map: bannerTex, emissive: 0x222222 }));
    banner.position.set(0, 9, 0);
    holder.add(banner);
    tr.group.add(holder);
    void L;
  },

  _buildBoxes(tr, def) {
    const tex = this._tex(tr, canvasTex(128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#ff5e5e'); gr.addColorStop(0.33, '#ffd84d'); gr.addColorStop(0.66, '#4dd2ff'); gr.addColorStop(1, '#b56cff');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#fff'; g.font = 'bold 90px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = '#333'; g.strokeText('?', w / 2, h / 2 + 6); g.fillText('?', w / 2, h / 2 + 6);
    }, false));
    const geo = new THREE.BoxGeometry(1.7, 1.7, 1.7);
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.88, emissive: 0x444444 });
    tr.disposables.push(geo);
    for (const t of def.boxes) {
      const i = Math.floor(t * tr.N);
      const row = { idx: i, boxes: [] };
      for (const lat of [-6.4, -3.2, 0, 3.2, 6.4]) {
        const m = new THREE.Mesh(geo, mat);
        const pos = tr.P[i].clone().addScaledVector(tr.L[i], lat);
        pos.y += 1.3;
        m.position.copy(pos);
        tr.group.add(m);
        const box = { pos, lat, idx: i, mesh: m, active: true, timer: 0, phase: Math.random() * 6 };
        tr.boxes.push(box); row.boxes.push(box);
      }
      tr.boxRows.push(row);
    }
  },

  _buildPads(tr, def) {
    const tex = this._tex(tr, canvasTex(64, 128, (g, w, h) => {
      g.fillStyle = '#ff6d00'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffea00';
      for (let k = 0; k < 3; k++) {
        const y = 10 + k * 40;
        g.beginPath(); g.moveTo(8, y + 30); g.lineTo(w / 2, y); g.lineTo(w - 8, y + 30); g.lineTo(w - 8, y + 42); g.lineTo(w / 2, y + 12); g.lineTo(8, y + 42); g.fill();
      }
    }, false));
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const geo = new THREE.PlaneGeometry(4, 7);
    tr.disposables.push(geo);
    for (const [t, lat] of def.pads) {
      const i = Math.floor(t * tr.N);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      const holder = new THREE.Group();
      holder.position.copy(tr.P[i]).addScaledVector(tr.L[i], lat).setY(tr.P[i].y + 0.08);
      holder.rotation.y = Math.atan2(tr.T[i].x, tr.T[i].z);
      holder.rotation.x = -Math.atan(tr.slope[i]);
      holder.add(m);
      tr.group.add(holder);
      tr.pads.push({ idx: i, lat, len: Math.round(7 / tr.spacing) });
    }
  },

  _buildScenery(tr, def) {
    const th = tr.theme;
    const rnd = seeded(1234 + tr.index * 99);
    const b = tr.bounds;
    const cell = 6;
    const occ = new Set();
    const mark = (x, z, r) => {
      const r2 = Math.ceil(r / cell);
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      for (let i = -r2; i <= r2; i++) for (let j = -r2; j <= r2; j++) occ.add((cx + i) + ',' + (cz + j));
    };
    for (let i = 0; i < tr.N; i += 3) mark(tr.P[i].x, tr.P[i].z, tr.W + tr.O + 6 + (def.noSkirt ? 0 : tr.P[i].y * 1.7));
    const free = (x, z) => !occ.has(Math.floor(x / cell) + ',' + Math.floor(z / cell));
    const spots = (count, pad) => {
      const out = [];
      let tries = 0;
      while (out.length < count && tries < count * 20) {
        tries++;
        const x = b.minX - pad + rnd() * (b.maxX - b.minX + pad * 2);
        const z = b.minZ - pad + rnd() * (b.maxZ - b.minZ + pad * 2);
        if (free(x, z)) out.push([x, z]);
      }
      return out;
    };
    const dummy = new THREE.Object3D();
    const inst = (geo, mat, list, fn) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((s, k) => { fn(dummy, s, k); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); });
      tr.group.add(im); tr.disposables.push(geo);
      return im;
    };
    const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });

    const farRing = (count, minR, maxR) => {
      const out = [];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rnd() * 0.3;
        const r = b.size / 2 + minR + rnd() * (maxR - minR);
        out.push([b.cx + Math.cos(a) * r, b.cz + Math.sin(a) * r, 0.6 + rnd() * 0.8]);
      }
      return out;
    };

    if (th.scenery === 'grass' || th.scenery === 'beach') {
      const pts = spots(th.scenery === 'grass' ? 320 : 120, 120);
      const scales = pts.map(() => 0.8 + rnd() * 0.9);
      if (th.scenery === 'grass') {
        inst(new THREE.CylinderGeometry(0.35, 0.5, 3, 6), lam(0x7a4a26), pts, (d, s, k) => { d.position.set(s[0], 1.5 * scales[k], s[1]); d.scale.setScalar(scales[k]); });
        inst(new THREE.SphereGeometry(2.4, 8, 6), lam(0x2e8b3a), pts, (d, s, k) => { d.position.set(s[0], 4.6 * scales[k], s[1]); d.scale.setScalar(scales[k]); });
        const mush = spots(26, 60);
        inst(new THREE.CylinderGeometry(1.1, 1.4, 5, 10), lam(0xfff3e0), mush, (d, s) => { d.position.set(s[0], 2.5, s[1]); d.scale.set(1, 1, 1); });
        inst(new THREE.SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xe53935), mush, (d, s) => { d.position.set(s[0], 4.8, s[1]); });
        inst(new THREE.SphereGeometry(0.8, 6, 4), lam(0xffffff), mush.flatMap((s) => [[s[0] + 2, s[1]], [s[0] - 1.5, s[1] + 1.8], [s[0] - 0.5, s[1] - 2.3]]), (d, s) => { d.position.set(s[0], 7.6, s[1]); d.scale.set(1, 0.5, 1); });
        inst(new THREE.SphereGeometry(1, 10, 8), lam(0x5aa84d), farRing(28, 140, 260), (d, s) => { d.position.set(s[0], -10, s[1]); d.scale.set(70 * s[2], 50 * s[2], 70 * s[2]); });
      } else {
        // praia: coqueiros, guarda-sóis
        inst(new THREE.CylinderGeometry(0.3, 0.5, 8, 6), lam(0x9c6b3c), pts, (d, s, k) => { d.position.set(s[0], 4 * scales[k], s[1]); d.rotation.z = (rnd() - 0.5) * 0.3; d.scale.setScalar(scales[k]); });
        inst(new THREE.ConeGeometry(3.5, 2, 7), lam(0x2fa84f), pts, (d, s, k) => { d.position.set(s[0], 8.3 * scales[k], s[1]); d.rotation.set(0, 0, 0); d.scale.setScalar(scales[k]); });
        const umb = spots(40, 40);
        inst(new THREE.ConeGeometry(2.4, 1.2, 8), lam(0xff5a7a), umb, (d, s) => { d.position.set(s[0], 3.2, s[1]); });
        inst(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 4), lam(0xffffff), umb, (d, s) => { d.position.set(s[0], 1.6, s[1]); });
        inst(new THREE.SphereGeometry(1, 10, 8), lam(0x6db36d), farRing(14, 160, 260).filter((s) => s[1] < b.maxZ + 40), (d, s) => { d.position.set(s[0], -10, s[1]); d.scale.set(60 * s[2], 45 * s[2], 60 * s[2]); });
      }
      const clouds = []; for (let i = 0; i < 26; i++) clouds.push([b.cx + (rnd() - 0.5) * 900, b.cz + (rnd() - 0.5) * 900]);
      inst(new THREE.SphereGeometry(1, 8, 6), lam(0xffffff, { emissive: 0xbbbbbb }), clouds, (d, s) => { d.position.set(s[0], 70 + rnd() * 30, s[1]); d.scale.set(18 + rnd() * 14, 5, 10 + rnd() * 6); });
    } else if (th.scenery === 'desert') {
      const pts = spots(140, 120);
      inst(new THREE.CylinderGeometry(0.7, 0.8, 6, 8), lam(0x3f9b4a), pts, (d, s) => { d.position.set(s[0], 3, s[1]); d.scale.setScalar(0.8 + ((s[0] * 13.7) % 1 + 1) % 1 * 0.6); });
      inst(new THREE.CylinderGeometry(0.45, 0.5, 2.6, 8), lam(0x3f9b4a), pts, (d, s) => { d.position.set(s[0] + 1.2, 3.6, s[1]); d.rotation.set(0, 0, 0); });
      const rocks = spots(70, 100);
      inst(new THREE.DodecahedronGeometry(2.5, 0), lam(0xb5651d), rocks, (d, s) => { d.position.set(s[0], 0.8, s[1]); d.rotation.set(rnd() * 3, rnd() * 3, 0); d.scale.set(1 + rnd(), 0.6 + rnd() * 0.8, 1 + rnd()); });
      inst(new THREE.ConeGeometry(1, 1, 4), lam(0xe0a85a), farRing(10, 160, 260), (d, s) => { d.position.set(s[0], 30 * s[2], s[1]); d.scale.set(70 * s[2], 60 * s[2], 70 * s[2]); d.rotation.y = s[2]; });
      inst(new THREE.CylinderGeometry(1, 1.3, 1, 7), lam(0xc0703a), farRing(16, 120, 220), (d, s) => { d.position.set(s[0], 18 * s[2], s[1]); d.scale.set(30 * s[2], 36 * s[2], 30 * s[2]); });
    } else if (th.scenery === 'snow') {
      const pts = spots(300, 120);
      const sc = pts.map(() => 0.8 + rnd() * 1.0);
      inst(new THREE.ConeGeometry(2.6, 5, 7), lam(0x1f5f3a), pts, (d, s, k) => { d.position.set(s[0], 3 * sc[k], s[1]); d.scale.setScalar(sc[k]); });
      inst(new THREE.ConeGeometry(1.8, 3.6, 7), lam(0xf4f8ff), pts, (d, s, k) => { d.position.set(s[0], 6.2 * sc[k], s[1]); d.scale.setScalar(sc[k]); });
      const men = spots(18, 40);
      inst(new THREE.SphereGeometry(1.4, 10, 8), lam(0xffffff), men, (d, s) => { d.position.set(s[0], 1.2, s[1]); });
      inst(new THREE.SphereGeometry(0.95, 10, 8), lam(0xffffff), men, (d, s) => { d.position.set(s[0], 3.1, s[1]); });
      inst(new THREE.ConeGeometry(0.2, 0.9, 6), lam(0xff7a1a), men, (d, s) => { d.position.set(s[0], 3.2, s[1] + 1.1); d.rotation.set(Math.PI / 2, 0, 0); });
      inst(new THREE.ConeGeometry(1, 1, 6), lam(0xdfe9f5), farRing(16, 140, 260), (d, s) => { d.position.set(s[0], 45 * s[2], s[1]); d.scale.set(80 * s[2], 90 * s[2], 80 * s[2]); });
      // flocos de neve
      const flakeGeo = new THREE.BufferGeometry();
      const arr = new Float32Array(1500 * 3);
      for (let i = 0; i < 1500; i++) arr.set([b.cx + (rnd() - 0.5) * 700, rnd() * 80, b.cz + (rnd() - 0.5) * 700], i * 3);
      flakeGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6 }));
      tr.group.add(flakes); tr.disposables.push(flakeGeo);
      tr.animate = (dt) => {
        const a = flakeGeo.attributes.position.array;
        for (let i = 1; i < a.length; i += 3) { a[i] -= dt * 4; if (a[i] < 0) a[i] = 80; }
        flakeGeo.attributes.position.needsUpdate = true;
      };
    } else if (th.scenery === 'neon') {
      const pts = spots(220, 160);
      const winTex = this._tex(tr, canvasTex(64, 128, (g, w, h) => {
        g.fillStyle = '#0d0820'; g.fillRect(0, 0, w, h);
        for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) {
          if (Math.random() < 0.55) { g.fillStyle = ['#ffd84d', '#00f0ff', '#ff2bd6', '#ffffff'][Math.floor(Math.random() * 4)]; g.fillRect(x, y, 5, 6); }
        }
      }));
      const bmat = new THREE.MeshLambertMaterial({ map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.9 });
      const hs = pts.map(() => 15 + rnd() * 60);
      inst(new THREE.BoxGeometry(1, 1, 1), bmat, pts, (d, s, k) => { const w = 8 + rnd() * 10; d.position.set(s[0], hs[k] / 2, s[1]); d.scale.set(w, hs[k], 8 + rnd() * 10); });
      const stars = new THREE.BufferGeometry();
      const arr = new Float32Array(1200 * 3);
      for (let i = 0; i < 1200; i++) {
        const a = rnd() * Math.PI * 2, e = rnd() * 1.2 + 0.1, r = 900;
        arr.set([b.cx + Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, b.cz + Math.sin(a) * Math.cos(e) * r], i * 3);
      }
      stars.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      tr.group.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false })));
      tr.disposables.push(stars);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }));
      moon.position.set(b.cx + 300, 260, b.cz - 450);
      tr.group.add(moon); tr.disposables.push(moon.geometry);
    }
  },

  dispose(tr, scene) {
    scene.remove(tr.group);
    tr.group.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } if (o.geometry) o.geometry.dispose(); });
    tr.disposables.forEach((d) => d.dispose && d.dispose());
  },
};
