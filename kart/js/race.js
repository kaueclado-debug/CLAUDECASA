// Lógica da corrida: física dos karts, IA, poderes, voltas e câmeras.
const DIFFS = [
  { name: 'Fácil', cc: '50cc', speed: 0.82, bot: 0.86, itemDelay: 3.0, avoid: 0.25, drift: false, rocket: 0.15, rubber: 0.09, aim: 0.6 },
  { name: 'Médio', cc: '100cc', speed: 1.0, bot: 0.95, itemDelay: 1.5, avoid: 0.6, drift: true, rocket: 0.35, rubber: 0.07, aim: 0.85 },
  { name: 'Difícil', cc: '150cc', speed: 1.17, bot: 1.01, itemDelay: 0.6, avoid: 0.95, drift: true, rocket: 0.6, rubber: 0.05, aim: 1 },
];
const TOTAL_RACERS = 12;
const BASE_SPEED = 32, ACCEL = 24, BRAKE = 45, REVERSE = 11, TURN = 2.05;
const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

const V3 = THREE.Vector3;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const COL = {
  blue: new THREE.Color(0x40b0ff), orange: new THREE.Color(0xff8a00), purple: new THREE.Color(0xd060ff),
  fire: new THREE.Color(0xff7a1a), dust: new THREE.Color(0x705c40), white: new THREE.Color(0xffffff),
  yellow: new THREE.Color(0xffe14d), smoke: new THREE.Color(0x5a5a5a), ink: new THREE.Color(0x221133),
};
const DRIFT_LEVELS = [1.0, 2.1, 3.3];

class Kart {
  constructor(race, racerIndex, human) {
    this.race = race;
    this.ri = racerIndex;
    this.racer = RACERS[racerIndex];
    this.human = human; // {dev, pi} ou null
    this.pos = new V3(); this.vel = new V3();
    this.heading = 0; this.speed = 0;
    this.idx = 0; this.progressInt = 0; this.progress = 0; this.lat = 0; this.along = 0; this.ground = 0;
    this.hopY = 0; this.hopV = 0;
    this.item = null; this.itemCount = 0; this.roulette = 0; this.pending = null;
    this.boost = 0; this.star = 0; this.shrink = 0; this.spin = 0; this.launch = 0; this.invuln = 0; this.ink = 0; this.squish = 0;
    this.drift = { active: false, dir: 0, charge: 0, held: false, pressT: 0 };
    this.ctrl = { steer: 0, accel: 0, brake: 0, drift: false, item: false, look: false };
    this.finished = false; this.finishTime = 0; this.place = 0; this.rank = 0;
    this.lap = 0; this.wrongT = 0; this.msg = ''; this.msgT = 0; this.offroad = false;
    this.rev = 0; this.spinAngle = 0; this.visSteer = 0; this.autopilot = !human;
    this.ai = {
      skill: race.diff.bot * (0.96 + Math.random() * 0.07), rubber: 1,
      laneT: Math.random() * 10, laneFreq: 0.2 + Math.random() * 0.3, laneBias: (Math.random() - 0.5) * 6,
      itemTimer: 0, stuckT: 0, reverseT: 0, drifting: false, driftT: 0,
    };
    const m = Models.kart(this.racer);
    Object.assign(this, { root: m.root, tilt: m.tilt, body: m.body, wheels: m.wheels, steerers: m.steerers, flames: m.flames, paint: m.paint });
    this.shadow = Models.shadow();
    race.scene.add(this.root); race.scene.add(this.shadow);
    if (human) {
      this.label = Models.label('P' + (human.pi + 1), PLAYER_COLORS[human.pi]);
      this.label.position.set(0, 3.6, 0);
      this.root.add(this.label);
    }
  }
  get forward() { return new V3(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  get disabled() { return this.spin > 0 || this.launch > 0; }
  say(text, t = 1.6) { this.msg = text; this.msgT = t; }
}

class Race {
  constructor(cfg) {
    this.cfg = cfg;
    this.diff = DIFFS[cfg.diff];
    this.laps = cfg.laps;
    this.scene = new THREE.Scene();
    this.track = Tracks.build(cfg.track, this.scene);
    this.particles = new Particles(this.scene);
    this.time = 0; this.cdT = 0; this.state = 'countdown';
    this.objects = []; this.effects = [];
    this.finishCount = 0; this.endT = 0; this.done = false; this.flash = 0;
    this.karts = [];
    this.humans = [];

    // pilotos: humanos escolhem; bots ocupam os demais
    const used = new Set(cfg.humans.map((h) => h.racer));
    const bots = [];
    for (let i = 0; i < RACERS.length && cfg.humans.length + bots.length < TOTAL_RACERS; i++) if (!used.has(i)) bots.push(i);
    // embaralha bots
    for (let i = bots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bots[i], bots[j]] = [bots[j], bots[i]]; }
    const grid = cfg.gridOrder ? cfg.gridOrder.slice() : null;
    const order = [];
    for (const b of bots) order.push(new Kart(this, b, null));
    cfg.humans.forEach((h, pi) => { const k = new Kart(this, h.racer, { dev: h.dev, pi }); order.push(k); this.humans.push(k); });
    if (grid) order.sort((a, b) => grid.indexOf(a.ri) - grid.indexOf(b.ri));
    this.karts = order;
    this.karts.forEach((k, slot) => this.placeOnGrid(k, slot));

    this.cams = this.humans.map(() => new THREE.PerspectiveCamera(70, 1, 0.3, 1600));
    this.camState = this.humans.map((k) => ({ pos: k.pos.clone().add(new V3(0, 40, 0)).addScaledVector(k.forward, -60), heading: k.heading, fov: 70 }));
    this.overCam = new THREE.PerspectiveCamera(55, 1, 1, 3000);
    this.demoCam = new THREE.PerspectiveCamera(65, 1, 0.3, 1600);
    this.demoState = { target: 0, t: 0, pos: new V3(), heading: 0 };
    this.updateRanks();
    if (!cfg.demo) { Sound.setEngines(this.humans.length); Sound.playMusic(cfg.track); }
  }

  placeOnGrid(k, slot) {
    const tr = this.track;
    const row = Math.floor(slot / 2), col = slot % 2;
    const back = 7 + row * 5.5 + col * 2.6;
    const di = Math.round(back / tr.spacing);
    const idx = ((tr.N - di) % tr.N + tr.N) % tr.N;
    k.idx = idx; k.progressInt = -di; k.progress = -di;
    k.pos.copy(tr.P[idx]).addScaledVector(tr.L[idx], (col ? 1 : -1) * 4.2);
    k.heading = Math.atan2(tr.T[idx].x, tr.T[idx].z);
    this.locate(k);
    k.pos.y = k.ground;
    this.syncKart(k, 0);
  }

  // ---------- pista ----------
  locate(o, wide = false) {
    const tr = this.track, N = tr.N, P = tr.P;
    let best = o.idx, bd = Infinity;
    const R = wide ? (N >> 1) : 40;
    for (let d = -R; d <= R; d++) {
      const j = (o.idx + d + N) % N, p = P[j];
      const dx = o.pos.x - p.x, dz = o.pos.z - p.z, dy = o.pos.y - p.y;
      const dd = dx * dx + dz * dz + dy * dy * 4;
      if (dd < bd) { bd = dd; best = j; }
    }
    let delta = best - o.idx;
    if (delta > N / 2) delta -= N; if (delta < -N / 2) delta += N;
    o.idx = best;
    const p = P[best], T = tr.T[best], L = tr.L[best];
    const rx = o.pos.x - p.x, rz = o.pos.z - p.z;
    o.lat = rx * L.x + rz * L.z;
    o.along = (rx * T.x + rz * T.z) / Math.max(0.2, Math.hypot(T.x, T.z));
    o.ground = p.y + o.along * tr.slope[best];
    if (!wide && Math.abs(o.lat) > tr.W + tr.O + 8) return this.locate(o, true) + delta;
    return delta;
  }
  wallClamp(o, radius, bounce = 1.6) {
    const tr = this.track, lim = tr.W + tr.O - radius;
    if (Math.abs(o.lat) <= lim) return 0;
    const L = tr.L[o.idx], s = Math.sign(o.lat), over = Math.abs(o.lat) - lim;
    o.pos.x -= L.x * s * over; o.pos.z -= L.z * s * over;
    o.lat = s * lim;
    const vl = o.vel.x * L.x + o.vel.z * L.z;
    if (vl * s > 0) { o.vel.x -= L.x * vl * bounce; o.vel.z -= L.z * vl * bounce; return Math.abs(vl); }
    return 0;
  }
  idxAhead(from, to) { let d = to - from; const N = this.track.N; if (d < 0) d += N; return d; }

  // ---------- loop ----------
  update(dt) {
    this.time += dt;
    if (this.state === 'countdown') {
      const prev = this.cdT;
      this.cdT += dt;
      for (const n of [1, 2, 3]) if (prev < n && this.cdT >= n && !this.cfg.demo) Sound.play('count');
      if (this.cdT >= 4) { this.state = 'race'; this.raceStart = this.time; if (!this.cfg.demo) Sound.play('go'); this.rocketStart(); }
    }
    this.raceTime = this.state === 'countdown' ? 0 : this.time - this.raceStart;

    for (const k of this.karts) this.controls(k, dt);
    for (const k of this.karts) this.stepKart(k, dt);
    this.kartCollisions();
    this.updateObjects(dt);
    this.updateBoxes(dt);
    this.updateRanks();
    for (const k of this.karts) this.syncKart(k, dt);
    this.particles.update(dt);
    if (this.track.animate) this.track.animate(dt);
    this.flash = Math.max(0, this.flash - dt * 1.5);
    this.updateCams(dt);
    this.humans.forEach((k, i) => Sound.engine(i, Math.abs(k.speed) / (BASE_SPEED * this.diff.speed), k.boost > 0));

    if (!this.cfg.demo && this.humans.length && this.humans.every((k) => k.finished)) {
      this.endT += dt;
      if (this.endT > 4 && !this.done) this.finalize();
    }
    if (this.cfg.demo && this.karts.some((k) => k.finished)) this.restartDemo = true;
  }

  rocketStart() {
    for (const k of this.karts) {
      if (k.human) {
        if (k.rev > 0.05 && k.rev < 1.9) { k.boost = 1.2; k.say('LARGADA TURBO!', 1.2); Sound.play('boost'); }
      } else if (Math.random() < this.diff.rocket) k.boost = 1.0;
      k.rev = 0;
    }
  }

  controls(k, dt) {
    const c = k.ctrl;
    if (k.human && !k.autopilot) {
      const s = Input.state(k.human.dev);
      c.steer = s.steer; c.accel = s.accel; c.brake = s.brake; c.drift = s.drift; c.look = s.look;
      c.item = Input.pressed(k.human.dev, 'item');
    } else this.ai(k, dt);
    if (this.state === 'countdown') {
      if (c.accel > 0.5) k.rev += dt; else k.rev = 0;
    }
  }

  // ---------- IA ----------
  ai(k, dt) {
    const tr = this.track, N = tr.N, c = k.ctrl, a = k.ai, d = this.diff;
    const spd = Math.max(k.speed, 6);
    const li = (k.idx + Math.round((7 + spd * 0.5) / tr.spacing)) % N;
    a.laneT += dt * a.laneFreq;
    let lane = Math.sin(a.laneT) * tr.W * 0.45 + a.laneBias;
    // procura caixas de item
    if (!k.item && k.roulette <= 0) {
      for (const row of tr.boxRows) {
        const ah = this.idxAhead(k.idx, row.idx) * tr.spacing;
        if (ah > 4 && ah < 45) {
          let best = null;
          for (const b of row.boxes) if (b.active && (!best || Math.abs(b.lat - k.lat) < Math.abs(best.lat - k.lat))) best = b;
          if (best) lane = best.lat;
          break;
        }
      }
    }
    // desvia de perigos
    if (a.avoidRoll === undefined || Math.random() < dt * 0.5) a.avoidRoll = Math.random() < d.avoid;
    if (a.avoidRoll) {
      for (const o of this.objects) {
        if (o.type !== 'banana' && o.type !== 'bomb' && o.type !== 'green') continue;
        const ah = this.idxAhead(k.idx, o.idx) * tr.spacing;
        if (ah > 0 && ah < 22 && Math.abs(o.lat - lane) < 2.8) lane = o.lat + (lane >= o.lat ? 3.6 : -3.6);
      }
    }
    lane = clamp(lane, -tr.W + 1.5, tr.W - 1.5);
    const tgt = tr.P[li], L = tr.L[li];
    const tx = tgt.x + L.x * lane, tz = tgt.z + L.z * lane;
    const desired = Math.atan2(tx - k.pos.x, tz - k.pos.z);
    const diff = wrapAngle(desired - k.heading);
    c.steer = clamp(-diff * 2.6, -1, 1);
    if (k.ink > 0) c.steer = clamp(c.steer + Math.sin(this.time * 3 + k.ri) * 0.6, -1, 1);
    // curvatura à frente
    const far = (k.idx + Math.round((18 + spd * 0.9) / tr.spacing)) % N;
    const T1 = tr.T[k.idx], T2 = tr.T[far];
    const curv = wrapAngle(Math.atan2(T2.x, T2.z) - Math.atan2(T1.x, T1.z));
    a.curv = curv;
    c.accel = 1; c.brake = 0; c.look = false;
    if (Math.abs(diff) > 0.75 && k.speed > 18) { c.accel = 0; c.brake = 0.5; }
    // drift dos bots
    c.drift = false;
    if (d.drift && !k.offroad) {
      if (!a.drifting && Math.abs(curv) > 0.55 && k.speed > 20) { a.drifting = true; a.driftT = 0; a.driftDir = -Math.sign(curv); }
      if (a.drifting) {
        a.driftT += dt;
        c.drift = true;
        if (a.driftT < 0.1) c.steer = a.driftDir;
        if ((Math.abs(curv) < 0.2 && a.driftT > 0.6) || a.driftT > 2.6 || k.disabled) { a.drifting = false; c.drift = false; }
      }
    }
    // destrava se ficar preso
    if (this.state === 'race' && k.speed < 3 && !k.disabled) a.stuckT += dt; else a.stuckT = 0;
    if (a.stuckT > 1.2) { a.reverseT = 0.9; a.stuckT = 0; }
    if (a.reverseT > 0) { a.reverseT -= dt; c.accel = 0; c.brake = 1; c.steer = -c.steer; }
    // contramão (ex.: depois de rodar)
    if (Math.abs(wrapAngle(Math.atan2(T1.x, T1.z) - k.heading)) > 2.2 && k.speed < 8) { c.brake = 1; c.accel = 0; c.steer = diff > 0 ? 1 : -1; }
    // itens
    c.item = false;
    if (k.item && k.roulette <= 0 && this.state === 'race') {
      a.itemTimer -= dt;
      if (a.itemTimer <= 0) c.item = this.aiWantsItem(k);
    }
  }
  aiWantsItem(k) {
    const a = k.ai, fwd = k.forward;
    const near = (pred) => this.karts.some((o) => o !== k && pred(o));
    switch (k.item) {
      case 'banana': return near((o) => { const d = o.pos.distanceTo(k.pos); return d < 18 && o.rank > k.rank; }) || a.itemTimer < -5;
      case 'green': return near((o) => {
        const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z, d = Math.hypot(dx, dz);
        return d < 32 && d > 3 && (dx * fwd.x + dz * fwd.z) / d > 0.97 - (1 - this.diff.aim) * 0.1;
      }) || a.itemTimer < -7;
      case 'bomb': return near((o) => { const dx = o.pos.x - k.pos.x, dz = o.pos.z - k.pos.z, d = Math.hypot(dx, dz); return d < 45 && d > 12 && (dx * fwd.x + dz * fwd.z) / d > 0.85; }) || a.itemTimer < -6;
      case 'mushroom': case 'triple': return Math.abs(a.curv || 0) < 0.25 && !k.offroad || k.offroad;
      case 'star': return k.rank > 0 || a.itemTimer < -3;
      default: return true;
    }
  }

  // ---------- física ----------
  stepKart(k, dt) {
    const tr = this.track, th = tr.theme, c = k.ctrl;
    for (const t of ['boost', 'star', 'shrink', 'spin', 'launch', 'invuln', 'ink', 'squish', 'msgT']) if (k[t] > 0) k[t] = Math.max(0, k[t] - dt);
    if (k.roulette > 0) {
      const before = k.roulette;
      k.roulette -= dt;
      if (k.human && Math.floor(before * 12) !== Math.floor(k.roulette * 12)) Sound.play('tick');
      if (k.roulette <= 0) {
        k.item = k.pending; k.itemCount = k.item === 'triple' ? 3 : 1;
        k.ai.itemTimer = this.diff.itemDelay * (0.4 + Math.random());
        if (k.human) Sound.play('got');
      }
    }
    if (this.state === 'countdown') { this.locate(k); k.pos.y = k.ground; return; }

    const fwd = k.forward;
    let maxS = BASE_SPEED * this.diff.speed;
    if (!k.human || k.autopilot) maxS *= k.ai.skill * k.ai.rubber;
    if (k.shrink > 0) maxS *= 0.72;
    k.offroad = Math.abs(k.lat) > tr.W + 1.3;
    if (k.offroad && k.boost <= 0 && k.star <= 0) maxS *= th.offMult;
    if (k.star > 0) maxS *= 1.2;
    if (k.boost > 0) maxS *= 1.38;
    k.maxS = maxS;

    const disabled = k.disabled;
    if (c.item && k.item && k.roulette <= 0 && !disabled) this.useItem(k);

    if (!disabled) {
      if (k.boost > 0) k.speed = Math.min(maxS, k.speed + 80 * dt);
      const target = maxS * c.accel;
      if (c.brake > 0.1 && c.accel < 0.5) {
        if (k.speed > 0.5) k.speed -= BRAKE * c.brake * dt;
        else k.speed = Math.max(-REVERSE, k.speed - 18 * c.brake * dt);
      } else if (k.speed < target) {
        k.speed += ACCEL * dt * (1 - 0.55 * clamp(k.speed / maxS, 0, 1)) * (k.speed < 0 ? 2.5 : 1);
        if (k.speed > target) k.speed = target;
      } else {
        const drag = c.accel > 0.05 ? 30 : 9;
        k.speed = Math.max(target, k.speed - drag * dt);
        if (c.accel <= 0.05 && k.speed < 0) k.speed = Math.min(0, k.speed + 12 * dt);
      }
    } else {
      k.speed *= Math.exp(-2.5 * dt);
    }

    // drift
    const dr = k.drift;
    if (c.drift && !dr.held && !disabled) {
      dr.pressT = this.time;
      if (k.hopY <= 0.01) k.hopV = 5.5;
    }
    if (c.drift && !dr.active && !disabled && this.time - dr.pressT < 0.35 && Math.abs(c.steer) > 0.35 && k.speed > 11) {
      dr.active = true; dr.dir = Math.sign(c.steer); dr.charge = 0;
    }
    dr.held = c.drift;
    if (dr.active) {
      if (!c.drift || k.speed < 7 || disabled) {
        let lvl = 0; for (let i = 0; i < 3; i++) if (dr.charge >= DRIFT_LEVELS[i]) lvl = i + 1;
        if (lvl > 0 && !disabled) {
          k.boost = Math.max(k.boost, [0, 0.6, 1.1, 1.8][lvl]);
          if (k.human) Sound.play('mini', lvl);
        }
        dr.active = false; dr.charge = 0;
      } else if (!k.offroad) {
        dr.charge += dt * (0.8 + 0.7 * Math.max(0, c.steer * dr.dir));
      }
    }

    // direção
    const sf = clamp(Math.abs(k.speed) / 10, 0, 1) * (1 - 0.18 * clamp(Math.abs(k.speed) / 45, 0, 1));
    let turn;
    if (dr.active) {
      const s01 = (c.steer * dr.dir + 1) / 2;
      turn = -dr.dir * TURN * (0.55 + 0.7 * s01);
    } else {
      turn = -c.steer * TURN * sf * Math.sign(k.speed || 1);
      if (k.speed < 0) turn *= 0.8;
    }
    if (!disabled) k.heading = wrapAngle(k.heading + turn * dt);
    k.visSteer += (c.steer - k.visSteer) * Math.min(1, dt * 12);

    // velocidade com aderência
    const grip = th.grip * (dr.active ? 0.45 : 1) * (disabled ? 0.35 : 1);
    const f = 1 - Math.exp(-grip * dt);
    k.vel.x += (fwd.x * k.speed - k.vel.x) * f;
    k.vel.z += (fwd.z * k.speed - k.vel.z) * f;
    k.pos.x += k.vel.x * dt;
    k.pos.z += k.vel.z * dt;

    // pulo / lançamento
    k.hopV -= 32 * dt; k.hopY += k.hopV * dt;
    if (k.hopY < 0) { k.hopY = 0; k.hopV = 0; }

    // localização na pista
    const prevIdx = k.idx;
    const delta = this.locate(k);
    k.progressInt += delta;
    k.progress = k.progressInt + k.along / tr.spacing;
    const hit = this.wallClamp(k, 1.1);
    if (hit > 6) { k.speed *= 0.55; if (k.human) { Sound.play('wall'); Input.rumble(k.human.dev, 0.4, 0.2, 120); } }
    else if (hit > 0) k.speed *= 0.97;
    k.pos.y = k.ground + k.hopY;
    void prevIdx;

    // turbo nas faixas
    for (const p of tr.pads) {
      const ah = this.idxAhead(p.idx, k.idx);
      if (ah < p.len && Math.abs(k.lat - p.lat) < 2.3 && k.hopY < 0.5) {
        if (k.boost < 0.3 && k.human) Sound.play('boost');
        k.boost = Math.max(k.boost, 1.0);
      }
    }

    // voltas
    const lap = Math.floor(k.progress / tr.N) + 1;
    if (lap > k.lap && !k.finished) {
      k.lap = lap;
      if (lap > this.laps) this.finishKart(k);
      else if (k.human && lap > 1) {
        if (lap === this.laps) { k.say('VOLTA FINAL!', 2); Sound.play('finalLap'); }
        else { k.say('VOLTA ' + lap, 1.5); Sound.play('lap'); }
      }
    }
    // contramão
    const T = tr.T[k.idx];
    if (k.human && !k.finished && (fwd.x * T.x + fwd.z * T.z) < -0.4 && Math.abs(k.speed) > 2) k.wrongT += dt; else k.wrongT = 0;

    // partículas
    this.kartParticles(k, dt, fwd);
  }

  kartParticles(k, dt, fwd) {
    const P = this.particles;
    const rx = Math.cos(k.heading), rz = -Math.sin(k.heading);
    const back = (side) => [k.pos.x - fwd.x * 1.4 + rx * side, k.pos.y + 0.3, k.pos.z - fwd.z * 1.4 + rz * side];
    const dr = k.drift;
    if (dr.active) {
      let lvl = 0; for (let i = 0; i < 3; i++) if (dr.charge >= DRIFT_LEVELS[i]) lvl = i + 1;
      const col = lvl === 0 ? COL.smoke : lvl === 1 ? COL.blue : lvl === 2 ? COL.orange : COL.purple;
      if (lvl > 0 || Math.random() < 0.3) for (const s of [-1, 1]) {
        const [x, y, z] = back(s);
        P.emit(x, y, z, (Math.random() - 0.5) * 4 - fwd.x * 3, Math.random() * 4, (Math.random() - 0.5) * 4 - fwd.z * 3, col, 0.3, 12);
      }
    }
    if (k.boost > 0 && Math.random() < 0.8) {
      const [x, y, z] = back(0);
      P.emit(x, y + 0.3, z, -fwd.x * 6 + (Math.random() - 0.5) * 2, Math.random() * 2, -fwd.z * 6 + (Math.random() - 0.5) * 2, COL.fire, 0.35);
    }
    if (k.offroad && Math.abs(k.speed) > 8 && Math.random() < 0.5) {
      const [x, y, z] = back((Math.random() - 0.5) * 2);
      P.emit(x, y, z, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, COL.dust, 0.5, 6);
    }
    if (k.star > 0 && Math.random() < 0.7) {
      P.emit(k.pos.x + (Math.random() - 0.5) * 2.5, k.pos.y + Math.random() * 2.5, k.pos.z + (Math.random() - 0.5) * 2.5, 0, 2, 0, new THREE.Color().setHSL(Math.random(), 1, 0.6), 0.5);
    }
    if (k.ink > 0 && Math.random() < 0.3) {
      P.emit(k.pos.x, k.pos.y + 2.2, k.pos.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, COL.purple, 0.4);
    }
  }

  finishKart(k) {
    k.finished = true; k.finishTime = this.raceTime; k.place = ++this.finishCount;
    k.drift.active = false;
    if (k.human) {
      k.autopilot = true;
      k.say(k.place + 'º LUGAR!', 999);
      Sound.play('finish');
      Input.rumble(k.human.dev, 0.5, 0.8, 400);
    }
  }

  kartCollisions() {
    const ks = this.karts;
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i], b = ks[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dy = b.pos.y - a.pos.y;
      if (Math.abs(dy) > 2.5) continue;
      const r = (a.shrink > 0 ? 0.65 : 1.15) + (b.shrink > 0 ? 0.65 : 1.15);
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = r - d;
      if (a.star > 0 && b.star <= 0) this.hitKart(b, 'spin', a);
      else if (b.star > 0 && a.star <= 0) this.hitKart(a, 'spin', b);
      else if (a.shrink > 0 && b.shrink <= 0) this.hitKart(a, 'squish', b);
      else if (b.shrink > 0 && a.shrink <= 0) this.hitKart(b, 'squish', a);
      a.pos.x -= nx * ov / 2; a.pos.z -= nz * ov / 2;
      b.pos.x += nx * ov / 2; b.pos.z += nz * ov / 2;
      const rv = (b.vel.x - a.vel.x) * nx + (b.vel.z - a.vel.z) * nz;
      if (rv < 0) {
        const jimp = -1.5 * rv / 2;
        a.vel.x -= nx * jimp; a.vel.z -= nz * jimp;
        b.vel.x += nx * jimp; b.vel.z += nz * jimp;
        if (-rv > 4) {
          if (a.human || b.human) Sound.play('bump');
          if (a.human) Input.rumble(a.human.dev, 0.3, 0.3, 90);
          if (b.human) Input.rumble(b.human.dev, 0.3, 0.3, 90);
        }
      }
    }
  }

  hitKart(k, kind, src) {
    if (k.star > 0) return 'star';
    if (k.invuln > 0) return false;
    if (kind === 'spin') { k.spin = 1.0; k.speed *= 0.35; }
    else if (kind === 'launch') { k.launch = 1.3; k.hopV = 13; k.speed *= 0.25; }
    else if (kind === 'squish') { k.spin = 0.8; k.squish = 1.6; k.speed *= 0.3; }
    k.invuln = (kind === 'launch' ? 1.3 : 1.0) + 0.9;
    k.drift.active = false; k.boost = 0;
    if (k.human) {
      Sound.play('hit');
      Input.rumble(k.human.dev, 1, 0.8, kind === 'launch' ? 500 : 300);
      k.say(kind === 'squish' ? 'ESMAGADO!' : 'AI!', 1);
    }
    if (src && src.human && src !== k) src.say('ACERTOU ' + k.racer.name.toUpperCase() + '!', 1.2);
    return true;
  }

  // ---------- poderes ----------
  chooseItem(k) {
    const n = this.karts.length;
    const p = n > 1 ? k.rank / (n - 1) : 0;
    const w = {
      banana: 30 * (1 - p) + 4,
      green: 26 * (1 - p) + 8,
      red: 6 + 16 * p,
      mushroom: 8 + 16 * p,
      triple: 18 * p,
      star: p > 0.45 ? 16 * p : 0,
      lightning: p > 0.7 ? 9 * p : 0,
      bomb: 5 + 7 * p,
      ink: p > 0.25 ? 7 : 0,
    };
    if (this.objects.length > 60) { w.banana = 0; }
    let total = 0; for (const key in w) total += w[key];
    let r = Math.random() * total;
    for (const key in w) { r -= w[key]; if (r <= 0) return key; }
    return 'banana';
  }

  useItem(k) {
    const type = k.item;
    k.itemCount--;
    if (k.itemCount <= 0) k.item = null;
    const fwd = k.forward;
    switch (type) {
      case 'mushroom': case 'triple':
        k.boost = Math.max(k.boost, 1.3); k.speed = Math.max(k.speed, k.maxS || 30);
        if (k.human) Sound.play('boost');
        break;
      case 'star':
        k.star = 7.5; k.spin = 0; k.launch = 0; k.shrink = 0;
        if (k.human) Sound.play('star');
        break;
      case 'banana': {
        this.addObject('banana', k, k.pos.clone().addScaledVector(fwd, -2.6));
        Sound.play('drop');
        break;
      }
      case 'green': case 'red': {
        const dir = k.ctrl.look ? -1 : 1;
        const o = this.addObject(type, k, k.pos.clone().addScaledVector(fwd, dir * 2.8));
        const sp = Math.max(52, Math.abs(k.speed) + 24);
        o.vel.copy(fwd).multiplyScalar(dir * sp);
        o.speed = sp;
        if (type === 'red' && dir > 0) {
          o.target = this.karts.find((x) => x.rank === k.rank - 1 && !x.finished) || null;
        }
        Sound.play('throw');
        break;
      }
      case 'bomb': {
        const o = this.addObject('bomb', k, k.pos.clone().addScaledVector(fwd, 2.5));
        o.vel.copy(fwd).multiplyScalar(Math.max(0, k.speed) + 24); o.vel.y = 11; o.pos.y += 1.5;
        o.fuse = 2.4;
        Sound.play('throw');
        break;
      }
      case 'lightning':
        for (const o of this.karts) {
          if (o === k || o.star > 0) continue;
          o.shrink = 4 + 2 * (1 - o.rank / 11); o.spin = Math.max(o.spin, 0.6); o.speed *= 0.6;
          o.item = null; o.roulette = 0; o.drift.active = false; o.boost = 0;
          if (o.human) { Input.rumble(o.human.dev, 0.8, 0.8, 300); o.say('RAIO!', 1.2); }
        }
        this.flash = 1; Sound.play('lightning');
        break;
      case 'ink':
        for (const o of this.karts) if (o !== k && o.rank < k.rank) { o.ink = 4.5; if (o.human) o.say('TINTA!', 1); }
        Sound.play('ink');
        break;
    }
  }

  addObject(type, owner, pos) {
    const mesh = type === 'banana' ? Models.banana() : type === 'bomb' ? Models.bomb() : Models.shell(type === 'red' ? 0xe53935 : 0x2ecc40);
    const o = { type, owner, pos, vel: new V3(), idx: owner.idx, lat: 0, along: 0, ground: 0, age: 0, life: type === 'red' ? 14 : type === 'green' ? 9 : 999, mesh, target: null, bounces: 0, speed: 0, dead: false };
    this.locate(o);
    if (type !== 'bomb') o.pos.y = o.ground;
    this.scene.add(mesh);
    this.objects.push(o);
    const bananas = this.objects.filter((x) => x.type === 'banana');
    if (bananas.length > 30) this.removeObject(bananas[0]);
    return o;
  }
  removeObject(o) { o.dead = true; this.scene.remove(o.mesh); }

  explode(pos, owner) {
    const m = Models.explosion();
    m.position.copy(pos);
    this.scene.add(m);
    this.effects.push({ mesh: m, t: 0, dur: 0.6, size: 9 });
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2, s = 6 + Math.random() * 14;
      this.particles.emit(pos.x, pos.y + 1, pos.z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s, Math.sin(a) * Math.cos(e) * s, Math.random() < 0.5 ? COL.fire : COL.yellow, 0.7, 10);
    }
    for (const k of this.karts) {
      const d = k.pos.distanceTo(pos);
      if (d < 8.5) this.hitKart(k, 'launch', owner);
      else if (k.human && d < 40) Input.rumble(k.human.dev, 0.4, 0.2, 200);
    }
    Sound.play('explode');
  }

  updateObjects(dt) {
    const tr = this.track;
    for (const o of this.objects) {
      if (o.dead) continue;
      o.age += dt;
      if (o.age > o.life) { this.removeObject(o); continue; }
      if (o.type === 'green' || o.type === 'red') {
        if (o.type === 'red' && o.vel.lengthSq() > 1) {
          let ax, az;
          const t = o.target;
          if (t && !t.finished && t.pos.distanceTo(o.pos) < 28 && Math.abs(t.pos.y - o.pos.y) < 4) { ax = t.pos.x; az = t.pos.z; }
          else {
            const ai = (o.idx + Math.round(12 / tr.spacing)) % tr.N;
            const lane = t ? clamp(t.lat, -tr.W, tr.W) * 0.6 : o.lat * 0.9;
            ax = tr.P[ai].x + tr.L[ai].x * lane; az = tr.P[ai].z + tr.L[ai].z * lane;
          }
          const dx = ax - o.pos.x, dz = az - o.pos.z, dl = Math.hypot(dx, dz) || 1;
          const cur = Math.hypot(o.vel.x, o.vel.z) || 1;
          const f = 1 - Math.exp(-7 * dt);
          let nx = o.vel.x / cur + (dx / dl - o.vel.x / cur) * f, nz = o.vel.z / cur + (dz / dl - o.vel.z / cur) * f;
          const nl = Math.hypot(nx, nz) || 1;
          o.vel.x = nx / nl * o.speed; o.vel.z = nz / nl * o.speed;
        }
        o.pos.x += o.vel.x * dt; o.pos.z += o.vel.z * dt;
        this.locate(o);
        if (this.wallClamp(o, 0.6, 2) > 0) { o.bounces++; if (o.type === 'red') o.bounces--; }
        o.pos.y = o.ground + 0.05;
        o.mesh.rotation.y += dt * 12;
        if (Math.random() < 0.4) this.particles.emit(o.pos.x, o.pos.y + 0.4, o.pos.z, 0, 1, 0, o.type === 'red' ? COL.fire : COL.white, 0.25);
      } else if (o.type === 'bomb') {
        o.vel.y -= 30 * dt;
        o.pos.addScaledVector(o.vel, dt);
        this.locate(o);
        this.wallClamp(o, 0.8, 1.5);
        if (o.pos.y <= o.ground) { o.pos.y = o.ground; o.vel.y = 0; o.vel.x *= Math.exp(-4 * dt); o.vel.z *= Math.exp(-4 * dt); }
        o.fuse -= dt;
        const s = 1 + Math.sin(o.age * (o.fuse < 1 ? 30 : 12)) * 0.12;
        o.mesh.scale.setScalar(s);
        if (o.fuse <= 0) { this.explode(o.pos, o.owner); this.removeObject(o); continue; }
      }
      o.mesh.position.copy(o.pos);
      if (o.type === 'banana' || o.type === 'bomb') o.mesh.position.y = o.pos.y;
      // colisão com karts
      for (const k of this.karts) {
        if (k === o.owner && o.age < 0.6) continue;
        const r = (k.shrink > 0 ? 0.7 : 1.2) + 0.65;
        const dx = k.pos.x - o.pos.x, dz = k.pos.z - o.pos.z, dy = k.pos.y - o.pos.y;
        if (dx * dx + dz * dz > r * r || Math.abs(dy) > 2.2) continue;
        if (o.type === 'bomb') { this.explode(o.pos, o.owner); this.removeObject(o); break; }
        const res = this.hitKart(k, 'spin', o.owner);
        if (res) { this.removeObject(o); break; }
      }
    }
    // colisão entre objetos
    const live = this.objects.filter((o) => !o.dead);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (a.dead || b.dead) continue;
      if (a.type === 'banana' && b.type === 'banana') continue;
      if (a.type !== 'green' && a.type !== 'red' && b.type !== 'green' && b.type !== 'red') continue;
      if (a.pos.distanceToSquared(b.pos) < 1.6) {
        for (const o of [a, b]) {
          if (o.type === 'bomb') this.explode(o.pos, o.owner);
          this.removeObject(o);
        }
        for (let n = 0; n < 12; n++) this.particles.emit(a.pos.x, a.pos.y + 0.5, a.pos.z, (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8, COL.white, 0.4, 10);
      }
    }
    this.objects = this.objects.filter((o) => !o.dead);
    // efeitos visuais
    for (const e of this.effects) {
      e.t += dt;
      const f = e.t / e.dur;
      e.mesh.scale.setScalar(1 + f * e.size);
      e.mesh.material.opacity = 0.8 * (1 - f);
    }
    this.effects = this.effects.filter((e) => { if (e.t >= e.dur) { this.scene.remove(e.mesh); e.mesh.material.dispose(); return false; } return true; });
  }

  updateBoxes(dt) {
    for (const b of this.track.boxes) {
      if (!b.active) {
        b.timer -= dt;
        if (b.timer <= 0) { b.active = true; b.mesh.visible = true; b.mesh.scale.setScalar(0.1); }
        continue;
      }
      b.phase += dt;
      b.mesh.rotation.set(b.phase * 0.7, b.phase, 0);
      b.mesh.position.y = b.pos.y + Math.sin(b.phase * 2) * 0.25;
      if (b.mesh.scale.x < 1) b.mesh.scale.setScalar(Math.min(1, b.mesh.scale.x + dt * 2));
      for (const k of this.karts) {
        const dx = k.pos.x - b.pos.x, dz = k.pos.z - b.pos.z, dy = k.pos.y + 0.8 - b.pos.y;
        if (dx * dx + dz * dz < 4.6 && Math.abs(dy) < 2.2) {
          b.active = false; b.mesh.visible = false; b.timer = 3;
          for (let n = 0; n < 14; n++) this.particles.emit(b.pos.x, b.pos.y, b.pos.z, (Math.random() - 0.5) * 10, Math.random() * 8, (Math.random() - 0.5) * 10, new THREE.Color().setHSL(Math.random(), 0.9, 0.6), 0.5, 15);
          if (!k.item && k.roulette <= 0) {
            k.pending = this.chooseItem(k);
            k.roulette = 1.1;
            if (k.human) Sound.play('box');
          }
          break;
        }
      }
    }
  }

  updateRanks() {
    const sorted = this.karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.place - b.place;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    sorted.forEach((k, i) => { k.rank = i; });
    this.order = sorted;
    // elástico dos bots em relação aos humanos
    if (this.humans.length && this.state === 'race') {
      const best = Math.max(...this.humans.map((h) => h.progress));
      const worst = Math.min(...this.humans.map((h) => h.progress));
      for (const k of this.karts) {
        if (k.human) continue;
        const gapAhead = (k.progress - best) / this.track.N;
        const gapBehind = (worst - k.progress) / this.track.N;
        let r = 1;
        if (gapBehind > 0.08) r = 1 + Math.min(1, (gapBehind - 0.08) * 4) * this.diff.rubber;
        else if (gapAhead > 0.12) r = 1 - Math.min(1, (gapAhead - 0.12) * 3) * this.diff.rubber;
        k.ai.rubber += (r - k.ai.rubber) * 0.02;
      }
    }
  }

  syncKart(k, dt) {
    const tr = this.track;
    k.root.position.copy(k.pos);
    k.root.rotation.y = k.heading;
    k.tilt.rotation.x = -Math.atan(tr.slope[k.idx] * Math.cos(wrapAngle(k.heading - Math.atan2(tr.T[k.idx].x, tr.T[k.idx].z))));
    let yaw = 0;
    if (k.drift.active) yaw = k.drift.dir * -0.38;
    if (k.spin > 0) k.spinAngle += dt * 14; else k.spinAngle *= Math.max(0, 1 - dt * 10);
    k.body.rotation.y = yaw + k.spinAngle;
    k.body.rotation.x = k.launch > 0 ? (1.3 - k.launch) * 5 : 0;
    k.body.rotation.z = k.drift.active ? k.drift.dir * 0.06 : -k.visSteer * 0.04;
    const sc = k.shrink > 0 ? 0.55 : 1;
    k.body.scale.set(sc, sc * (k.squish > 0 ? 0.3 : 1), sc);
    for (const w of k.wheels) w.rotation.x += k.speed * dt / 0.46;
    for (const s of k.steerers) s.rotation.y = -k.visSteer * 0.45;
    const fl = k.boost > 0;
    for (const f of k.flames) { f.visible = fl; if (fl) f.scale.set(1, 1, 0.7 + Math.random() * 0.6); }
    if (k.star > 0) { k.paint.emissive.setHSL((this.time * 3) % 1, 1, 0.45); }
    else if (k.invuln > 0 && Math.floor(this.time * 15) % 2) k.paint.emissive.setRGB(0.5, 0.5, 0.5);
    else k.paint.emissive.setRGB(0, 0, 0);
    k.shadow.position.set(k.pos.x, k.ground + 0.08, k.pos.z);
    k.shadow.rotation.y = k.heading;
    k.shadow.scale.setScalar(sc * (1 - Math.min(0.5, k.hopY * 0.08)));
  }

  // ---------- câmeras ----------
  updateCams(dt) {
    this.humans.forEach((k, i) => {
      const cs = this.camState[i], cam = this.cams[i];
      const look = k.ctrl.look && !k.autopilot;
      let targetHeading = k.heading + (k.drift.active ? k.drift.dir * -0.15 : 0);
      cs.heading += wrapAngle(targetHeading - cs.heading) * (1 - Math.exp(-6 * dt));
      const dir = look ? -1 : 1;
      const fx = Math.sin(cs.heading) * dir, fz = Math.cos(cs.heading) * dir;
      const dist = 7.2, h = 3.1;
      const want = new V3(k.pos.x - fx * dist, k.ground + h, k.pos.z - fz * dist);
      const intro = this.state === 'countdown' && this.cdT < 1.6;
      cs.pos.lerp(want, look ? 1 : 1 - Math.exp(-(intro ? 3 : 10) * dt));
      cam.position.copy(cs.pos);
      cam.lookAt(k.pos.x + fx * 4, k.ground + 1.3, k.pos.z + fz * 4);
      const fov = 70 + (k.boost > 0 ? 12 : 0) + clamp(k.speed / 50, 0, 1) * 6;
      cs.fov += (fov - cs.fov) * (1 - Math.exp(-4 * dt));
      if (Math.abs(cam.fov - cs.fov) > 0.01) { cam.fov = cs.fov; cam.updateProjectionMatrix(); }
    });
    // visão geral (3 jogadores) / câmera do modo demonstração
    const b = this.track.bounds;
    const a = this.time * 0.06;
    this.overCam.position.set(b.cx + Math.cos(a) * b.size * 0.35, b.size * 0.75, b.cz + Math.sin(a) * b.size * 0.35);
    this.overCam.lookAt(b.cx, 0, b.cz);
    if (this.cfg.demo) {
      const ds = this.demoState;
      ds.t -= dt;
      if (ds.t <= 0) { ds.t = 9; ds.target = this.order ? this.order[Math.floor(Math.random() * 4)].ri : 0; ds.snap = true; }
      const k = this.karts.find((x) => x.ri === ds.target) || this.karts[0];
      ds.heading += wrapAngle(k.heading - ds.heading) * (1 - Math.exp(-3 * dt));
      const side = Math.sin(this.time * 0.3) * 0.9;
      const want = new V3(k.pos.x - Math.sin(ds.heading + side) * 10, k.ground + 4.5, k.pos.z - Math.cos(ds.heading + side) * 10);
      if (ds.snap) { ds.pos.copy(want); ds.snap = false; } else ds.pos.lerp(want, 1 - Math.exp(-4 * dt));
      this.demoCam.position.copy(ds.pos);
      this.demoCam.lookAt(k.pos.x, k.ground + 1.2, k.pos.z);
    }
  }

  views(W, H) {
    const n = this.humans.length;
    if (this.cfg.demo || n === 0) return [{ x: 0, y: 0, w: W, h: H, cam: this.demoCam }];
    const hw = Math.floor(W / 2), hh = Math.floor(H / 2);
    if (n === 1) return [{ x: 0, y: 0, w: W, h: H, cam: this.cams[0], k: this.humans[0] }];
    if (n === 2) return [
      { x: 0, y: 0, w: W, h: hh, cam: this.cams[0], k: this.humans[0] },
      { x: 0, y: hh, w: W, h: H - hh, cam: this.cams[1], k: this.humans[1] },
    ];
    const v = [
      { x: 0, y: 0, w: hw, h: hh, cam: this.cams[0], k: this.humans[0] },
      { x: hw, y: 0, w: W - hw, h: hh, cam: this.cams[1], k: this.humans[1] },
      { x: 0, y: hh, w: hw, h: H - hh, cam: this.cams[2], k: this.humans[2] },
    ];
    if (n === 4) v.push({ x: hw, y: hh, w: W - hw, h: H - hh, cam: this.cams[3], k: this.humans[3] });
    else v.push({ x: hw, y: hh, w: W - hw, h: H - hh, cam: this.overCam, overview: true });
    return v;
  }

  render(renderer, W, H) {
    const views = this.views(W, H);
    renderer.setScissorTest(true);
    for (const v of views) {
      for (const h of this.humans) if (h.label) h.label.visible = h !== v.k;
      renderer.setViewport(v.x, H - v.y - v.h, v.w, v.h);
      renderer.setScissor(v.x, H - v.y - v.h, v.w, v.h);
      v.cam.aspect = v.w / v.h; v.cam.updateProjectionMatrix();
      renderer.render(this.scene, v.cam);
    }
    renderer.setScissorTest(false);
    return views;
  }

  finalize() {
    this.done = true;
    const remaining = this.order.filter((k) => !k.finished);
    const avg = BASE_SPEED * this.diff.speed * 0.85;
    for (const k of remaining) {
      k.finished = true; k.place = ++this.finishCount;
      k.finishTime = this.raceTime + Math.max(0, (this.laps * this.track.N - k.progress) * this.track.spacing) / avg;
    }
    this.results = this.karts.slice().sort((a, b) => a.place - b.place).map((k) => ({
      ri: k.ri, name: k.racer.name, color: k.racer.color, human: k.human ? k.human.pi : null, time: k.finishTime, place: k.place, points: POINTS[k.place - 1] || 0,
    }));
    Sound.stopEngines();
  }

  dispose() {
    Sound.stopEngines();
    Sound.stopMusic();
    for (const o of this.objects) this.scene.remove(o.mesh);
    this.particles.dispose(this.scene);
    Tracks.dispose(this.track, this.scene);
    this.scene.traverse((o) => {
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map && o.isSprite) m.map.dispose(); m.dispose(); });
    });
  }
}
