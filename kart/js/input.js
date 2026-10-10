// Entrada unificada: teclado (2 jogadores), mouse e controles (Xbox / PS5 / genéricos),
// detectados automaticamente pela Gamepad API.
const Input = (() => {
  const keys = new Set();
  const mouse = { x: 0, buttons: 0, mode: false };
  let kbSplit = true;           // true: kb1 = WASD, kb2 = setas. false: um teclado só lê os dois conjuntos
  let mouseOwner = 'kb1';
  const cur = {}, prev = {};
  const padInfo = {};            // index -> {type, name, id}
  const connectCbs = [];

  const STD = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
  // Mapeamentos "crus" usados quando o navegador não entrega mapping === 'standard'
  const PS_RAW = { a: 1, b: 2, x: 0, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9, ltAxis: 3, rtAxis: 4, hat: 9 };
  const XB_RAW = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, back: 6, start: 7, ltAxis: 2, rtAxis: 5, dpadAxes: [6, 7] };
  const GEN_RAW = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, back: 8, start: 9 };

  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (GAME_KEYS.includes(e.code) || ((e.code === 'Enter' || e.code === 'Space') && e.target && e.target.tagName === 'BUTTON')) e.preventDefault();
    if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code)) mouse.mode = false;
    if (typeof Sound !== 'undefined') Sound.init();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.buttons = 0; });
  window.addEventListener('mousemove', (e) => { mouse.x = (e.clientX / window.innerWidth) * 2 - 1; });
  window.addEventListener('mousedown', (e) => {
    mouse.buttons = e.buttons;
    if (e.target && e.target.closest && e.target.closest('button')) e.preventDefault(); // não rouba o foco
    if (e.target && e.target.id === 'hud') mouse.mode = true;
    if (typeof Sound !== 'undefined') Sound.init();
  });
  window.addEventListener('mouseup', (e) => { mouse.buttons = e.buttons; });
  window.addEventListener('contextmenu', (e) => { if (e.target && e.target.id === 'hud') e.preventDefault(); });

  function padType(id) {
    const s = (id || '').toLowerCase();
    if (/054c|dualsense|dualshock|playstation|sony|ps5|ps4/.test(s)) return 'ps';
    if (/045e|xbox|xinput|microsoft/.test(s)) return 'xbox';
    if (/wireless controller/.test(s)) return 'ps';
    return 'generic';
  }
  function padName(type, id) {
    const s = (id || '').toLowerCase();
    if (type === 'ps') return /0ce6|0df2|dualsense|ps5/.test(s) ? 'Controle PS5 (DualSense)' : 'Controle PlayStation';
    if (type === 'xbox') return 'Controle Xbox';
    return 'Controle ' + (id || '').replace(/\(.*?\)/g, '').trim().slice(0, 22);
  }
  function registerPad(gp) {
    if (!gp) return;
    const known = padInfo[gp.index];
    if (known && known.id === gp.id) return;
    const type = padType(gp.id);
    padInfo[gp.index] = { type, name: padName(type, gp.id), id: gp.id };
    connectCbs.forEach((cb) => cb('connect', 'gp' + gp.index, padInfo[gp.index]));
  }
  window.addEventListener('gamepadconnected', (e) => registerPad(e.gamepad));
  window.addEventListener('gamepaddisconnected', (e) => {
    const info = padInfo[e.gamepad.index];
    delete padInfo[e.gamepad.index];
    connectCbs.forEach((cb) => cb('disconnect', 'gp' + e.gamepad.index, info));
  });

  function getPads() {
    try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (_) { return []; }
  }

  const k = (c) => keys.has(c);
  const empty = () => ({ steer: 0, accel: 0, brake: 0, drift: false, item: false, look: false, pause: false, confirm: false, back: false, up: false, down: false, left: false, right: false, start: false });

  function readKeys(set) {
    const s = empty();
    if (set === 'A') {
      s.steer = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0);
      s.accel = k('KeyW') ? 1 : 0;
      s.brake = k('KeyS') ? 1 : 0;
      s.drift = k('Space') || k('ShiftLeft');
      s.item = k('KeyE') || k('KeyQ');
      s.look = k('KeyR');
      s.confirm = k('Space') || k('KeyE');
      s.back = k('Escape') || k('Backspace');
      s.pause = k('Escape') || k('KeyP');
      s.start = k('Space') || k('KeyE');
      s.up = k('KeyW'); s.down = k('KeyS'); s.left = k('KeyA'); s.right = k('KeyD');
    } else {
      s.steer = (k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0);
      s.accel = k('ArrowUp') ? 1 : 0;
      s.brake = k('ArrowDown') ? 1 : 0;
      s.drift = k('ShiftRight') || k('Period') || k('Numpad0');
      s.item = k('Enter') || k('NumpadEnter') || k('ControlRight') || k('Slash');
      s.look = k('Comma') || k('Numpad1');
      s.confirm = k('Enter') || k('NumpadEnter');
      s.back = k('Backspace') || k('Escape');
      s.pause = k('Escape');
      s.start = k('Enter') || k('NumpadEnter');
      s.up = k('ArrowUp'); s.down = k('ArrowDown'); s.left = k('ArrowLeft'); s.right = k('ArrowRight');
    }
    return s;
  }
  function merge(a, b) {
    const s = empty();
    for (const key in s) {
      if (typeof s[key] === 'boolean') s[key] = a[key] || b[key];
      else s[key] = Math.abs(a[key]) > Math.abs(b[key]) ? a[key] : b[key];
    }
    return s;
  }
  function applyMouse(s) {
    const lmb = (mouse.buttons & 1) !== 0, rmb = (mouse.buttons & 2) !== 0, mmb = (mouse.buttons & 4) !== 0;
    if (lmb) s.accel = 1;
    if (rmb) s.item = true;
    if (mmb) s.drift = true;
    if (mouse.mode && s.steer === 0) {
      let m = mouse.x / 0.45;
      if (Math.abs(m) < 0.06) m = 0;
      s.steer = Math.max(-1, Math.min(1, m));
    }
  }
  function readPad(gp, info) {
    const s = empty();
    const type = info ? info.type : 'generic';
    const m = gp.mapping === 'standard' ? STD : type === 'ps' ? PS_RAW : type === 'xbox' ? XB_RAW : GEN_RAW;
    const btn = (i) => { const b = i == null ? null : gp.buttons[i]; return b ? (typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5) : false; };
    const val = (i) => { const b = i == null ? null : gp.buttons[i]; return b ? (typeof b === 'object' ? b.value : b) : 0; };
    const ax = (i) => (i != null && gp.axes[i] != null ? gp.axes[i] : 0);
    let lx = ax(0), ly = ax(1);
    if (Math.abs(lx) < 0.18) lx = 0; else lx = Math.sign(lx) * (Math.abs(lx) - 0.18) / 0.82;
    if (Math.abs(ly) < 0.3) ly = 0;
    let du = btn(m.up), dd = btn(m.down), dl = btn(m.left), dr = btn(m.right);
    if (m.hat != null && gp.axes.length > m.hat) {
      const h = ax(m.hat);
      if (h >= -1.05 && h <= 1.05) {
        const dir = Math.round((h + 1) / (2 / 7));
        du = du || dir === 0 || dir === 1 || dir === 7;
        dr = dr || dir === 1 || dir === 2 || dir === 3;
        dd = dd || dir === 3 || dir === 4 || dir === 5;
        dl = dl || dir === 5 || dir === 6 || dir === 7;
      }
    }
    if (m.dpadAxes && gp.axes.length > m.dpadAxes[1]) {
      dl = dl || ax(m.dpadAxes[0]) < -0.5; dr = dr || ax(m.dpadAxes[0]) > 0.5;
      du = du || ax(m.dpadAxes[1]) < -0.5; dd = dd || ax(m.dpadAxes[1]) > 0.5;
    }
    const trig = (bi, ai) => {
      let v = val(bi);
      if (ai != null && gp.axes.length > ai && gp.mapping !== 'standard') {
        const a = ax(ai);
        if (a !== 0) v = Math.max(v, (a + 1) / 2);
      }
      return v > 0.08 ? v : 0;
    };
    s.steer = lx !== 0 ? lx : (dr ? 1 : 0) - (dl ? 1 : 0);
    s.accel = Math.max(btn(m.a) ? 1 : 0, trig(m.rt, m.rtAxis));
    s.brake = Math.max(btn(m.b) ? 1 : 0, trig(m.lt, m.ltAxis));
    s.drift = btn(m.rb);
    s.item = btn(m.lb) || btn(m.x);
    s.look = btn(m.y);
    s.pause = btn(m.start);
    s.start = btn(m.start);
    s.confirm = btn(m.a);
    s.back = btn(m.b);
    s.up = du || ly < -0.5; s.down = dd || ly > 0.5;
    s.left = dl || ax(0) < -0.5; s.right = dr || ax(0) > 0.5;
    return s;
  }

  function update() {
    for (const id in cur) prev[id] = cur[id];
    const A = readKeys('A'), B = readKeys('B');
    if (kbSplit) { cur.kb1 = A; cur.kb2 = B; }
    else { cur.kb1 = merge(A, B); cur.kb2 = merge(A, B); }
    applyMouse(mouseOwner === 'kb2' ? cur.kb2 : cur.kb1);
    const pads = getPads();
    const seen = {};
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      registerPad(gp);
      seen[gp.index] = true;
      cur['gp' + gp.index] = readPad(gp, padInfo[gp.index]);
    }
    for (const id in cur) if (id.startsWith('gp') && !seen[id.slice(2)]) delete cur[id];
  }

  function state(dev) { return cur[dev] || empty(); }
  function pressed(dev, name) { const c = cur[dev], p = prev[dev]; return !!(c && c[name] && !(p && p[name])); }
  function anyPressed(name) {
    for (const id in cur) if (pressed(id, name)) return id;
    return null;
  }
  function devices() {
    const list = [
      { id: 'kb1', type: 'kb', name: 'Teclado A (WASD) + Mouse' },
      { id: 'kb2', type: 'kb', name: 'Teclado B (Setas)' },
    ];
    for (const id in cur) if (id.startsWith('gp')) {
      const info = padInfo[id.slice(2)] || { type: 'generic', name: 'Controle' };
      list.push({ id, type: info.type, name: info.name });
    }
    return list;
  }
  function deviceInfo(dev) {
    if (dev === 'kb1') return { type: 'kb', name: kbSplit ? 'Teclado A (WASD) + Mouse' : 'Teclado + Mouse' };
    if (dev === 'kb2') return { type: 'kb', name: kbSplit ? 'Teclado B (Setas)' : 'Teclado + Mouse' };
    const info = padInfo[dev.slice(2)];
    return info ? { type: info.type, name: info.name } : { type: 'generic', name: 'Controle desconectado' };
  }
  function pads() { return Object.keys(padInfo).map((i) => ({ id: 'gp' + i, ...padInfo[i] })); }
  function rumble(dev, strong = 0.6, weak = 0.6, ms = 200) {
    if (!dev || !dev.startsWith('gp')) return;
    const gp = getPads()[+dev.slice(2)];
    if (!gp) return;
    try {
      if (gp.vibrationActuator && gp.vibrationActuator.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
      } else if (gp.hapticActuators && gp.hapticActuators[0]) gp.hapticActuators[0].pulse(strong, ms);
    } catch (_) {}
  }
  // Rótulos de botão de acordo com o tipo de controle
  const LABELS = {
    xbox: { confirm: 'A', back: 'B', item: 'LB / X', drift: 'RB', accel: 'A / RT', brake: 'B / LT', start: 'Menu', look: 'Y' },
    ps: { confirm: '✕', back: '○', item: 'L1 / □', drift: 'R1', accel: '✕ / R2', brake: '○ / L2', start: 'Options', look: '△' },
    generic: { confirm: 'A', back: 'B', item: 'LB', drift: 'RB', accel: 'A / RT', brake: 'B / LT', start: 'Start', look: 'Y' },
    kb1: { confirm: 'Espaço', back: 'Esc', item: 'E / Botão direito', drift: 'Espaço', accel: 'W / Botão esquerdo', brake: 'S', start: 'Espaço', look: 'R' },
    kb2: { confirm: 'Enter', back: 'Backspace', item: 'Enter', drift: 'Shift dir.', accel: '↑', brake: '↓', start: 'Enter', look: ',' },
  };
  function labels(dev) {
    if (dev === 'kb1' || dev === 'kb2') return LABELS[dev];
    return LABELS[deviceInfo(dev).type] || LABELS.generic;
  }

  return {
    update, state, pressed, anyPressed, devices, deviceInfo, pads, rumble, labels,
    onConnect: (cb) => connectCbs.push(cb),
    setSplit: (v, owner = 'kb1') => { kbSplit = v; mouseOwner = owner; },
    mouse,
  };
})();
