// Menus, fluxo do jogo e loop principal.
(() => {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    HUD.resize(W, H);
  }
  window.addEventListener('resize', resize);
  resize();

  const App = {
    screen: 'title', race: null, demo: null, paused: false,
    slots: [],
    setup: { mode: 'single', track: 0, diff: 1, laps: 3 },
    gp: null,
  };
  window.App = App;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // ---------- toasts e controles conectados ----------
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }
  Input.onConnect((kind, id, info) => {
    if (!info) return;
    toast(kind === 'connect' ? `🎮 ${info.name} conectado!` : `🔌 ${info.name} desconectado`);
    if (kind === 'connect') Input.rumble(id, 0.4, 0.4, 150);
    if (kind === 'disconnect' && App.race && !App.paused && App.race.humans.some((k) => k.human.dev === id)) openPause();
    renderPads();
  });
  function renderPads() {
    const pads = Input.pads();
    const html = pads.length
      ? pads.map((p) => `<span class="pad-chip">🎮 ${p.name}</span>`).join('')
      : '<span class="pad-chip none">Nenhum controle detectado — conecte via Bluetooth/USB e aperte qualquer botão</span>';
    $('#title-pads').innerHTML = html;
    $('#join-pads').innerHTML = html;
  }
  renderPads();

  // ---------- telas ----------
  let focusIdx = 0;
  function show(name, viaDev) {
    App.screen = name;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'scr-' + name));
    document.body.classList.toggle('racing', !name);
    focusIdx = 0;
    if (name === 'join') {
      if (viaDev && !App.slots.some((s) => s.dev === viaDev) && App.slots.length === 0) joinDevice(viaDev);
      renderSlots();
    }
    if (name === 'setup') renderSetup();
    updateFocus();
  }
  function navItems() {
    const scr = $('.screen.active');
    return scr ? $$('.nav', scr).filter((b) => !b.disabled && b.offsetParent !== null && !b.closest('.opt.disabled')) : [];
  }
  function updateFocus() {
    const items = navItems();
    $$('.nav.focus').forEach((b) => b.classList.remove('focus'));
    if (!items.length) return;
    focusIdx = clamp(focusIdx, 0, items.length - 1);
    items[focusIdx].classList.add('focus');
    items[focusIdx].scrollIntoView({ block: 'nearest' });
  }
  function moveFocus(dx, dy) {
    const items = navItems();
    if (!items.length) return;
    const cur = items[clamp(focusIdx, 0, items.length - 1)].getBoundingClientRect();
    const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    let best = -1, bs = Infinity;
    items.forEach((b, i) => {
      if (i === focusIdx) return;
      const r = b.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy;
      if (along <= 4) return;
      const perp = Math.abs(x * dy) + Math.abs(y * dx);
      const score = along + perp * 2.5;
      if (score < bs) { bs = score; best = i; }
    });
    if (best >= 0) { focusIdx = best; updateFocus(); Sound.play('move'); }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button.nav');
    if (!b) return;
    const items = navItems();
    const i = items.indexOf(b);
    if (i >= 0) { focusIdx = i; updateFocus(); }
    activate(b, 'mouse');
  });
  document.addEventListener('mouseover', (e) => {
    const b = e.target.closest('button.nav');
    if (!b) return;
    const i = navItems().indexOf(b);
    if (i >= 0 && i !== focusIdx) { focusIdx = i; updateFocus(); }
  });

  function activate(b, dev) {
    Sound.init();
    const seg = b.closest('.seg');
    if (seg) {
      const group = seg.dataset.group;
      let v = b.dataset.value;
      App.setup[group] = group === 'mode' ? v : +v;
      Sound.play('select');
      renderSetup();
      return;
    }
    const act = b.dataset.act;
    Sound.play(act === 'back' ? 'back' : 'select');
    switch (act) {
      case 'play': show('join', dev === 'mouse' ? 'kb1' : dev); break;
      case 'controls': show('controls'); break;
      case 'toggle-sfx': Sound.setSfx(!Sound.sfxOn); b.textContent = 'Efeitos: ' + (Sound.sfxOn ? 'Ligados' : 'Desligados'); break;
      case 'toggle-music': Sound.setMusic(!Sound.musicOn); b.textContent = 'Música: ' + (Sound.musicOn ? 'Ligada' : 'Desligada'); break;
      case 'back': goBack(); break;
      case 'join-kb': {
        const dev = !App.slots.some((s) => s.dev === 'kb1') ? 'kb1' : !App.slots.some((s) => s.dev === 'kb2') ? 'kb2' : null;
        if (dev) joinDevice(dev);
        renderSlots();
        break;
      }
      case 'join-next': joinNext(); break;
      case 'start': startFromSetup(); break;
      case 'resume': closePause(); break;
      case 'restart': restartRace(); break;
      case 'quit': quitToMenu(); break;
      case 'next-race': nextGpRace(); break;
      case 'again': restartRace(); break;
      case 'to-setup': endRace(); show('setup'); break;
      case 'menu': quitToMenu(); break;
    }
  }
  function goBack() {
    const scr = $('.screen.active');
    if (!scr) return;
    if (App.screen === 'pause') { closePause(); return; }
    const back = scr.dataset.back;
    if (back) { if (App.screen === 'join') App.slots = []; show(back); }
  }

  // ---------- entrada de jogadores ----------
  function joinDevice(dev) {
    if (App.slots.length >= 4 || App.slots.some((s) => s.dev === dev)) return;
    const taken = new Set(App.slots.map((s) => s.racer));
    let racer = 0; while (taken.has(racer)) racer++;
    App.slots.push({ dev, racer, ready: false });
    Sound.play('join');
    Input.rumble(dev, 0.5, 0.5, 150);
  }
  function cycleRacer(slot, dir) {
    const taken = new Set(App.slots.filter((s) => s !== slot).map((s) => s.racer));
    let r = slot.racer;
    for (let i = 0; i < RACERS.length; i++) { r = (r + dir + RACERS.length) % RACERS.length; if (!taken.has(r)) break; }
    slot.racer = r; Sound.play('move');
  }
  function allReady() { return App.slots.length > 0 && App.slots.every((s) => s.ready); }
  function joinNext() {
    if (!App.slots.length) { toast('Entre com pelo menos 1 jogador'); return; }
    App.slots.forEach((s) => { s.ready = true; });
    show('setup');
  }
  function renderSlots() {
    const el = $('#slots');
    let html = '';
    for (let i = 0; i < 4; i++) {
      const s = App.slots[i];
      if (!s) { html += `<div class="slot"><div class="ptag" style="background:${PLAYER_COLORS[i]}55">P${i + 1}</div><div class="empty">Aperte confirmar<br>para entrar</div></div>`; continue; }
      const r = RACERS[s.racer];
      const info = Input.deviceInfo(s.dev);
      const lb = Input.labels(s.dev);
      html += `<div class="slot joined ${s.ready ? 'ready' : ''}" data-i="${i}">
        <div class="ptag" style="background:${PLAYER_COLORS[i]}">P${i + 1}</div>
        <div class="dev">${info.type === 'kb' ? '⌨️' : '🎮'} ${info.name}</div>
        <div class="pick"><button data-slot="${i}" data-d="-1">◀</button>
          <div class="avatar" style="background:${r.color};color:${r.accent}">${r.name[0]}</div>
          <button data-slot="${i}" data-d="1">▶</button></div>
        <div class="rname">${r.name}</div>
        <div class="status ${s.ready ? 'ok' : ''}">${s.ready ? '✔ PRONTO' : `Aperte ${lb.confirm} quando estiver pronto`}</div>
        <div class="actions"><button data-slot="${i}" data-a="ready">${s.ready ? 'Cancelar' : 'Pronto'}</button><button data-slot="${i}" data-a="leave">Sair</button></div>
      </div>`;
    }
    el.innerHTML = html;
    $('#btn-join-next').disabled = !App.slots.length;
  }
  $('#slots').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const s = App.slots[+b.dataset.slot]; if (!s) return;
    if (b.dataset.d) cycleRacer(s, +b.dataset.d);
    if (b.dataset.a === 'ready') { s.ready = !s.ready; Sound.play('select'); }
    if (b.dataset.a === 'leave') { App.slots.splice(App.slots.indexOf(s), 1); Sound.play('back'); }
    renderSlots();
  });
  function joinUpdate() {
    let changed = false;
    if (!App.slots.length && Input.anyPressed('back')) { Sound.play('back'); show('title'); return; }
    for (const d of Input.devices()) {
      const slot = App.slots.find((s) => s.dev === d.id);
      if (!slot) {
        if (Input.pressed(d.id, 'confirm') || (d.id.startsWith('gp') && Input.pressed(d.id, 'start'))) { joinDevice(d.id); changed = true; }
        continue;
      }
      if (Input.pressed(d.id, 'left')) { if (!slot.ready) cycleRacer(slot, -1); changed = true; }
      if (Input.pressed(d.id, 'right')) { if (!slot.ready) cycleRacer(slot, 1); changed = true; }
      if (Input.pressed(d.id, 'confirm') || Input.pressed(d.id, 'start')) {
        if (!slot.ready) { slot.ready = true; Sound.play('select'); }
        else if (allReady()) { show('setup'); return; }
        changed = true;
      }
      if (Input.pressed(d.id, 'back')) {
        if (slot.ready) slot.ready = false;
        else { App.slots.splice(App.slots.indexOf(slot), 1); if (!App.slots.length && d.id !== 'kb2') { Sound.play('back'); show('title'); return; } }
        Sound.play('back'); changed = true;
      }
    }
    if (changed) renderSlots();
  }

  // ---------- configuração ----------
  function buildTrackCards() {
    const el = $('#track-cards');
    el.innerHTML = '';
    Tracks.defs.forEach((def, i) => {
      const b = document.createElement('button');
      b.className = 'nav'; b.dataset.value = i;
      const c = document.createElement('canvas'); c.width = 300; c.height = 192;
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', `<span class="tname">${def.name}</span><span class="tdesc">${def.desc}</span>`);
      el.appendChild(b);
      const pts = Tracks.preview(i, 160);
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      const s = Math.min(260 / (maxX - minX), 160 / (maxZ - minZ));
      const g = c.getContext('2d');
      const col = { grass: '#6cc35a', desert: '#ffb74d', snow: '#b3e5fc', neon: '#ff2bd6', beach: '#4dd2ff' }[def.theme];
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      pts.forEach(([x, z], k) => { const px = 150 + (x - (minX + maxX) / 2) * s, pz = 96 + (z - (minZ + maxZ) / 2) * s; k ? g.lineTo(px, pz) : g.moveTo(px, pz); });
      g.closePath();
      g.strokeStyle = '#000'; g.lineWidth = 16; g.stroke();
      g.strokeStyle = col; g.lineWidth = 9; g.stroke();
      const [x0, z0] = pts[0];
      g.fillStyle = '#fff'; g.fillRect(150 + (x0 - (minX + maxX) / 2) * s - 6, 96 + (z0 - (minZ + maxZ) / 2) * s - 6, 12, 12);
    });
  }
  buildTrackCards();
  function renderSetup() {
    const st = App.setup;
    for (const seg of $$('#scr-setup .seg')) {
      const group = seg.dataset.group;
      for (const b of $$('button', seg)) b.classList.toggle('selected', String(st[group]) === b.dataset.value);
    }
    $('#opt-track').classList.toggle('disabled', st.mode === 'gp');
    const n = App.slots.length;
    $('#setup-summary').textContent = `${n} jogador${n > 1 ? 'es' : ''} + ${TOTAL_RACERS - n} bots = ${TOTAL_RACERS} pilotos • ${DIFFS[st.diff].name} (${DIFFS[st.diff].cc}) • ${st.laps} voltas` + (st.mode === 'gp' ? ' • 5 corridas com pontuação' : '');
  }

  // ---------- corrida ----------
  function stopDemo() { if (App.demo) { App.demo.dispose(); App.demo = null; } }
  function startDemo() {
    stopDemo();
    App.demo = new Race({ track: Math.floor(Math.random() * Tracks.defs.length), diff: 2, laps: 99, humans: [], demo: true });
  }
  function humansCfg() { return App.slots.map((s) => ({ dev: s.dev, racer: s.racer })); }
  function launch(track) {
    stopDemo();
    if (App.race) App.race.dispose();
    const devs = App.slots.map((s) => s.dev);
    const both = devs.includes('kb1') && devs.includes('kb2');
    Input.setSplit(both, devs.includes('kb1') || !devs.includes('kb2') ? 'kb1' : 'kb2');
    App.race = new Race({ track, diff: App.setup.diff, laps: App.setup.laps, humans: humansCfg() });
    App.paused = false;
    show(null);
  }
  function startFromSetup() {
    if (App.setup.mode === 'gp') {
      App.gp = { order: Tracks.defs.map((_, i) => i), index: 0, points: {} };
      launch(App.gp.order[0]);
    } else { App.gp = null; launch(App.setup.track); }
  }
  function restartRace() { if (!App.race) return; launch(App.race.cfg.track); }
  function nextGpRace() {
    if (!App.gp) return;
    App.gp.index++;
    launch(App.gp.order[App.gp.index]);
  }
  function endRace() {
    if (App.race) { App.race.dispose(); App.race = null; }
    App.paused = false;
    Input.setSplit(true);
    startDemo();
  }
  function quitToMenu() { endRace(); App.gp = null; show('title'); }
  function openPause() { if (!App.race || App.race.done) return; App.paused = true; Sound.stopEngines(); show('pause'); }
  function closePause() { App.paused = false; Sound.setEngines(App.race.humans.length); show(null); }

  function showResults() {
    const r = App.race;
    const res = r.results;
    const gp = App.gp;
    if (gp) for (const x of res) gp.points[x.ri] = (gp.points[x.ri] || 0) + x.points;
    const last = gp && gp.index >= gp.order.length - 1;
    let rows;
    if (gp) {
      const totals = res.map((x) => ({ ...x, total: gp.points[x.ri] })).sort((a, b) => b.total - a.total);
      rows = `<tr><th>#</th><th>Piloto</th><th>Tempo</th><th>Corrida</th><th>Total</th></tr>` + totals.map((x, i) =>
        `<tr class="${x.human != null ? 'me' : ''}"><td class="pos">${i + 1}º</td><td><span class="chip" style="background:${x.color}"></span>${x.name}${x.human != null ? ` <b style="color:${PLAYER_COLORS[x.human]}">P${x.human + 1}</b>` : ''}</td><td>${HUD.fmt(x.time)} (${x.place}º)</td><td>+${x.points}</td><td><b>${x.total}</b></td></tr>`).join('');
      $('#res-title').textContent = last ? `🏆 Campeão do Grande Prêmio: ${totals[0].name}!` : `Grande Prêmio — corrida ${gp.index + 1} de ${gp.order.length}`;
    } else {
      rows = `<tr><th>#</th><th>Piloto</th><th>Tempo</th><th>Pontos</th></tr>` + res.map((x) =>
        `<tr class="${x.human != null ? 'me' : ''}"><td class="pos">${x.place}º</td><td><span class="chip" style="background:${x.color}"></span>${x.name}${x.human != null ? ` <b style="color:${PLAYER_COLORS[x.human]}">P${x.human + 1}</b>` : ''}</td><td>${HUD.fmt(x.time)}</td><td>${x.points}</td></tr>`).join('');
      $('#res-title').textContent = `Resultado — ${r.track.def.name}`;
    }
    $('#res-table').innerHTML = rows;
    $('#res-buttons').innerHTML = gp && !last
      ? `<button class="nav primary big" data-act="next-race">Próxima corrida ▶</button><button class="nav" data-act="menu">Sair para o menu</button>`
      : gp
        ? `<button class="nav primary" data-act="menu">Voltar ao menu</button>`
        : `<button class="nav primary" data-act="again">Correr de novo</button><button class="nav" data-act="to-setup">Escolher outra pista</button><button class="nav" data-act="menu">Menu</button>`;
    show('results');
  }

  // ---------- navegação nos menus por controle/teclado ----------
  function menuUpdate() {
    if (!App.screen) return;
    if (App.screen === 'join') { joinUpdate(); if (App.screen !== 'join') return; }
    const any = (n) => Input.anyPressed(n);
    if (App.screen !== 'join') {
      if (any('up')) moveFocus(0, -1);
      if (any('down')) moveFocus(0, 1);
      if (any('left')) moveFocus(-1, 0);
      if (any('right')) moveFocus(1, 0);
      const dev = any('confirm');
      if (dev) { const items = navItems(); if (items[focusIdx]) activate(items[focusIdx], dev); return; }
      if (any('back')) { Sound.play('back'); goBack(); }
      if (App.screen === 'pause' && any('pause')) closePause();
    }
  }

  // ---------- loop ----------
  let last = performance.now();
  let started = false;
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    Input.update();
    menuUpdate();
    const r = App.race || App.demo;
    if (App.race && !App.screen) {
      for (const k of App.race.humans) if (!k.autopilot && Input.pressed(k.human.dev, 'pause')) { openPause(); break; }
    }
    if (r && !(App.race && App.paused)) r.update(dt);
    if (App.race && App.race.done && App.screen !== 'results' && !App.resultsShown) { App.resultsShown = true; showResults(); }
    if (App.race && !App.race.done) App.resultsShown = false;
    if (App.demo && App.demo.restartDemo) startDemo();
    if (r) {
      const views = r.render(renderer, W, H);
      HUD.draw(r, views, W, H, r.time);
    }
    if (!started) { started = true; document.body.classList.add('ready'); }
    requestAnimationFrame(frame);
  }
  App.launch = launch;
  startDemo();
  show('title');
  requestAnimationFrame(frame);
})();
