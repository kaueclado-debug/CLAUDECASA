// HUD desenhado num canvas 2D sobre o 3D, uma área por jogador.
const HUD = (() => {
  const canvas = document.getElementById('hud');
  const g = canvas.getContext('2d');
  let dpr = 1;
  let mapCache = null;

  function resize(W, H) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  function clear() { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); }

  const fmt = (t) => {
    if (!isFinite(t)) return '--:--.--';
    const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t * 100) % 100);
    return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
  };
  const ord = (n) => n + 'º';

  function text(str, x, y, size, color = '#fff', align = 'left', stroke = 0.16) {
    g.font = `900 ${size}px "Trebuchet MS", "Arial Black", sans-serif`;
    g.textAlign = align; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = size * stroke; g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.strokeText(str, x, y);
    g.fillStyle = color; g.fillText(str, x, y);
  }
  function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function placeColor(p) { return p === 1 ? '#ffd700' : p === 2 ? '#e0e0e0' : p === 3 ? '#ff9f43' : '#ffffff'; }

  function buildMap(race) {
    const tr = race.track, b = tr.bounds;
    const pts = [];
    for (let i = 0; i < tr.N; i += 6) pts.push([tr.P[i].x, tr.P[i].z]);
    mapCache = { race, pts, b };
  }
  function minimap(race, x, y, size, highlight) {
    if (!mapCache || mapCache.race !== race) buildMap(race);
    const { pts, b } = mapCache;
    const s = (size * 0.9) / b.size;
    const px = (wx) => x + size / 2 + (wx - b.cx) * s;
    const pz = (wz) => y + size / 2 + (wz - b.cz) * s;
    g.save();
    g.globalAlpha = 0.85;
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(px(p[0]), pz(p[1])) : g.moveTo(px(p[0]), pz(p[1])))); g.closePath();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(5, size * 0.07); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(3, size * 0.04); g.stroke();
    // linha de largada
    const p0 = race.track.P[0];
    g.fillStyle = '#111'; g.fillRect(px(p0.x) - 3, pz(p0.z) - 3, 6, 6);
    g.globalAlpha = 1;
    const ks = race.karts.slice().sort((a, b2) => (a.human ? 1 : 0) - (b2.human ? 1 : 0));
    for (const k of ks) {
      const r = k.human ? Math.max(4, size * 0.05) : Math.max(2.5, size * 0.03);
      g.beginPath(); g.arc(px(k.pos.x), pz(k.pos.z), r, 0, Math.PI * 2);
      g.fillStyle = k.racer.color; g.fill();
      g.lineWidth = k.human ? 2.5 : 1; g.strokeStyle = k.human ? (k === highlight ? '#fff' : PLAYER_COLORS[k.human.pi]) : 'rgba(0,0,0,0.7)'; g.stroke();
    }
    for (const o of race.objects) {
      g.fillStyle = o.type === 'banana' ? '#ffe135' : o.type === 'red' ? '#ff4040' : o.type === 'green' ? '#40ff60' : '#000';
      g.fillRect(px(o.pos.x) - 1.5, pz(o.pos.z) - 1.5, 3, 3);
    }
    g.restore();
  }

  function star(cx, cy, r, ri, n = 5) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? ri : r;
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
  }
  function shroom(cx, cy, s) {
    g.fillStyle = '#fff3d6'; rrect(cx - s * 0.2, cy, s * 0.4, s * 0.38, s * 0.08); g.fill(); g.stroke();
    g.fillStyle = '#e53935'; g.beginPath(); g.arc(cx, cy + s * 0.04, s * 0.42, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff';
    for (const [dx, dy, r] of [[0, -0.2, 0.1], [-0.26, -0.06, 0.07], [0.26, -0.06, 0.07]]) { g.beginPath(); g.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#222'; g.fillRect(cx - s * 0.1, cy + s * 0.1, s * 0.05, s * 0.12); g.fillRect(cx + s * 0.05, cy + s * 0.1, s * 0.05, s * 0.12);
  }
  function shellIcon(cx, cy, s, col) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy + s * 0.12, s * 0.42, s * 0.16, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy + s * 0.08, s * 0.36, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = s * 0.04;
    g.beginPath(); g.moveTo(cx - s * 0.12, cy - s * 0.24); g.lineTo(cx - s * 0.2, cy + s * 0.06); g.moveTo(cx + s * 0.12, cy - s * 0.24); g.lineTo(cx + s * 0.2, cy + s * 0.06); g.moveTo(cx - s * 0.12, cy - s * 0.1); g.lineTo(cx + s * 0.12, cy - s * 0.1); g.stroke();
  }
  function drawIcon(key, cx, cy, s) {
    g.save();
    g.lineJoin = 'round'; g.lineWidth = s * 0.05; g.strokeStyle = '#1a1a1a';
    switch (key) {
      case 'mushroom': shroom(cx, cy - s * 0.05, s * 0.95); break;
      case 'triple': shroom(cx - s * 0.2, cy + s * 0.06, s * 0.55); shroom(cx + s * 0.2, cy + s * 0.06, s * 0.55); shroom(cx, cy - s * 0.2, s * 0.55); break;
      case 'green': shellIcon(cx, cy, s, '#2ecc40'); break;
      case 'red': shellIcon(cx, cy, s, '#e53935'); break;
      case 'banana':
        g.fillStyle = '#ffe135'; g.beginPath();
        g.arc(cx - s * 0.05, cy - s * 0.2, s * 0.45, Math.PI * 0.15, Math.PI * 0.85);
        g.arc(cx - s * 0.05, cy - s * 0.45, s * 0.55, Math.PI * 0.78, Math.PI * 0.22, true);
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#5d4037'; g.fillRect(cx + s * 0.3, cy - s * 0.12, s * 0.08, s * 0.1);
        break;
      case 'star':
        g.fillStyle = '#ffd600'; star(cx, cy, s * 0.44, s * 0.2); g.fill(); g.stroke();
        g.fillStyle = '#222'; g.fillRect(cx - s * 0.1, cy - s * 0.08, s * 0.05, s * 0.13); g.fillRect(cx + s * 0.05, cy - s * 0.08, s * 0.05, s * 0.13);
        break;
      case 'lightning':
        g.fillStyle = '#ffeb3b'; g.beginPath();
        g.moveTo(cx + s * 0.12, cy - s * 0.45); g.lineTo(cx - s * 0.25, cy + s * 0.05); g.lineTo(cx - s * 0.02, cy + s * 0.05);
        g.lineTo(cx - s * 0.14, cy + s * 0.45); g.lineTo(cx + s * 0.26, cy - s * 0.08); g.lineTo(cx + s * 0.03, cy - s * 0.08); g.closePath(); g.fill(); g.stroke();
        break;
      case 'bomb':
        g.fillStyle = '#222'; g.beginPath(); g.arc(cx, cy + s * 0.08, s * 0.32, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#c8a165'; g.fillRect(cx - s * 0.04, cy - s * 0.34, s * 0.08, s * 0.14);
        g.fillStyle = '#ffb300'; star(cx + s * 0.02, cy - s * 0.38, s * 0.13, s * 0.06, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(cx - s * 0.12, cy - s * 0.02, s * 0.07, 0, Math.PI * 2); g.fill();
        break;
      case 'ink':
        g.fillStyle = '#7b1fa2'; g.beginPath(); g.ellipse(cx, cy - s * 0.1, s * 0.24, s * 0.28, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * s * 0.08, cy + s * 0.12); g.quadraticCurveTo(cx + i * s * 0.14, cy + s * 0.3, cx + i * s * 0.1, cy + s * 0.42); g.lineWidth = s * 0.07; g.strokeStyle = '#7b1fa2'; g.stroke(); }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - s * 0.09, cy - s * 0.12, s * 0.07, 0, Math.PI * 2); g.arc(cx + s * 0.09, cy - s * 0.12, s * 0.07, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#000'; g.beginPath(); g.arc(cx - s * 0.08, cy - s * 0.11, s * 0.035, 0, Math.PI * 2); g.arc(cx + s * 0.1, cy - s * 0.11, s * 0.035, 0, Math.PI * 2); g.fill();
        break;
    }
    g.restore();
  }

  function itemBox(k, x, y, s, time) {
    g.save();
    rrect(x, y, s, s, s * 0.2);
    g.fillStyle = 'rgba(20,20,40,0.6)'; g.fill();
    g.lineWidth = s * 0.06; g.strokeStyle = '#fff'; g.stroke();
    let key = k.item;
    if (k.roulette > 0) key = ITEM_KEYS[Math.floor(time * 14) % ITEM_KEYS.length];
    if (key) {
      if (k.roulette > 0) g.globalAlpha = 0.75;
      drawIcon(key, x + s / 2, y + s / 2, s * 0.8);
      g.globalAlpha = 1;
      if (!k.roulette && k.itemCount > 1) text('x' + k.itemCount, x + s * 0.92, y + s * 0.88, s * 0.28, '#fff', 'right');
      if (!k.roulette) text(ITEMS[key].name, x + s * 0.04, y + s + s * 0.16, Math.max(10, s * 0.17), '#fff', 'left');
    }
    g.restore();
  }

  function drawView(race, v, n, time) {
    const k = v.k;
    const { x, y, w, h } = v;
    const u = Math.min(w, h * 1.4) / 100; // unidade relativa
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();

    // tinta na tela
    if (k.ink > 0) {
      const a = Math.min(1, k.ink / 1.2) * 0.92;
      g.fillStyle = `rgba(25,10,40,${a})`;
      const seed = k.ri * 7;
      for (let i = 0; i < 9; i++) {
        const sx = x + w * (((seed + i * 37) % 100) / 100), sy = y + h * (((seed * 3 + i * 53) % 100) / 100);
        g.beginPath(); g.ellipse(sx, sy, w * 0.14, h * 0.18, i, 0, Math.PI * 2); g.fill();
      }
    }
    if (race.flash > 0) { g.fillStyle = `rgba(255,255,255,${race.flash * 0.7})`; g.fillRect(x, y, w, h); }
    if (k.star > 0) {
      g.strokeStyle = `hsla(${(time * 400) % 360},100%,60%,0.6)`; g.lineWidth = u * 2.2; g.strokeRect(x + u, y + u, w - 2 * u, h - 2 * u);
    }

    // jogador
    const pc = PLAYER_COLORS[k.human.pi];
    g.fillStyle = pc; rrect(x + u * 2, y + u * 2, u * 9, u * 5, u * 1.2); g.fill();
    text('P' + (k.human.pi + 1), x + u * 6.5, y + u * 4.6, u * 3.6, '#fff', 'center', 0.1);
    text(k.racer.name, x + u * 12.5, y + u * 4.6, u * 3, '#fff', 'left');

    // item
    itemBox(k, x + u * 2, y + u * 9, u * 13, time);

    // volta e tempo
    const lap = Math.max(1, Math.min(race.laps, k.lap || 1));
    text('VOLTA', x + w - u * 3, y + u * 4, u * 3, '#ffe066', 'right');
    text(`${lap}/${race.laps}`, x + w - u * 3, y + u * 9, u * 6, '#fff', 'right');
    text(fmt(k.finished ? k.finishTime : race.raceTime || 0), x + w - u * 3, y + u * 14, u * 3.4, '#fff', 'right');

    // posição
    const place = k.finished ? k.place : k.rank + 1;
    text(ord(place), x + w - u * 4, y + h - u * 9, u * 15, placeColor(place), 'right', 0.12);

    // velocímetro + carga do drift
    const sx = x + u * 3, sy = y + h - u * 6, sw = u * 26, sh = u * 2.6;
    const sp = Math.max(0, k.speed) / (BASE_SPEED * race.diff.speed * 1.38);
    rrect(sx, sy, sw, sh, sh / 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
    rrect(sx, sy, Math.max(sh, sw * Math.min(1, sp)), sh, sh / 2);
    g.fillStyle = k.boost > 0 ? '#ff7a1a' : '#4dd2ff'; g.fill();
    text(Math.round(Math.max(0, k.speed) * 3.6) + ' km/h', sx, sy - u * 2.2, u * 3, '#fff', 'left');
    if (k.drift.active) {
      const c = k.drift.charge;
      const col = c >= DRIFT_LEVELS[2] ? '#d060ff' : c >= DRIFT_LEVELS[1] ? '#ff8a00' : c >= DRIFT_LEVELS[0] ? '#40b0ff' : '#cccccc';
      const f = Math.min(1, c / DRIFT_LEVELS[2]);
      rrect(sx, sy - u * 6.5, sw * f + 2, u * 1.4, u * 0.7); g.fillStyle = col; g.fill();
      text('DRIFT', sx + sw + u, sy - u * 5.8, u * 2.4, col, 'left');
    }

    // minimapa
    {
      const ms = Math.min(w * (n === 1 ? 0.22 : 0.2), h * (n === 1 ? 0.3 : 0.4));
      minimap(race, x + w - ms - u * 2, y + h * 0.5 - ms * 0.75, ms, k);
    }

    // classificação (1 jogador)
    if (n === 1) {
      const list = race.order;
      const lh = u * 2.6;
      let yy = y + u * 31;
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        const me = o === k;
        g.globalAlpha = me ? 1 : 0.8;
        rrect(x + u * 2, yy - lh * 0.45, u * 15, lh * 0.9, lh * 0.3);
        g.fillStyle = me ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.45)'; g.fill();
        g.fillStyle = o.racer.color; g.fillRect(x + u * 2.6, yy - lh * 0.3, lh * 0.6, lh * 0.6);
        g.font = `800 ${lh * 0.6}px "Trebuchet MS", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillStyle = me ? '#111' : '#fff';
        g.fillText(`${i + 1}. ${o.racer.name}${o.human ? ' (P' + (o.human.pi + 1) + ')' : ''}`, x + u * 5, yy);
        yy += lh;
      }
      g.globalAlpha = 1;
    }

    // contagem regressiva
    const cx = x + w / 2, cy = y + h * 0.42;
    if (race.state === 'countdown' && race.cdT >= 1) {
      const nn = 4 - Math.floor(race.cdT);
      const fr = race.cdT % 1;
      text(String(nn), cx, cy, u * (26 - fr * 6), ['#ff4757', '#ffa502', '#2ed573'][3 - nn] || '#fff', 'center', 0.1);
    } else if (race.state === 'race' && race.raceTime < 1) {
      text('JÁ!', cx, cy, u * 24, '#2ed573', 'center', 0.1);
    } else if (race.state === 'countdown' && race.cdT < 1) {
      text(race.track.def.name, cx, cy, u * 7, '#fff', 'center');
    }
    if (k.msgT > 0 && k.msg) text(k.msg, cx, y + h * (k.finished ? 0.4 : 0.26), u * (k.finished ? 11 : 6), k.finished ? placeColor(k.place) : '#fff', 'center');
    if (k.wrongT > 1 && Math.floor(time * 3) % 2) text('⟲ CONTRAMÃO!', cx, y + h * 0.6, u * 6, '#ff4757', 'center');
    if (k.ctrl.look && !k.autopilot) text('OLHANDO PARA TRÁS', cx, y + h - u * 4, u * 3, '#ffe066', 'center');
    g.restore();

    // borda do viewport
    if (n > 1) { g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(x, y, w, h); }
  }

  function draw(race, views, W, H, time) {
    clear();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (race.cfg.demo) return;
    const n = race.humans.length;
    for (const v of views) {
      if (v.k) drawView(race, v, n, time);
      else if (v.overview) {
        g.save(); g.beginPath(); g.rect(v.x, v.y, v.w, v.h); g.clip();
        const s = Math.min(v.w, v.h) * 0.75;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(v.x, v.y, v.w, v.h);
        minimap(race, v.x + (v.w - s) / 2, v.y + (v.h - s) / 2, s, null);
        const u = Math.min(v.w, v.h) / 100;
        text('CLASSIFICAÇÃO', v.x + u * 3, v.y + u * 5, u * 4, '#ffe066');
        race.order.slice(0, 12).forEach((o, i) => {
          text(`${i + 1}. ${o.racer.name}${o.human ? ' P' + (o.human.pi + 1) : ''}`, v.x + u * 3, v.y + u * (11 + i * 5.5), u * 4, o.human ? PLAYER_COLORS[o.human.pi] : '#fff');
        });
        g.restore();
        g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(v.x, v.y, v.w, v.h);
      }
    }
  }

  return { resize, draw, clear, fmt };
})();
