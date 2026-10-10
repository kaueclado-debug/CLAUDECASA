// Áudio sintetizado com WebAudio: efeitos, motores e música chiptune simples.
const Sound = (() => {
  let ctx = null, master = null, sfxGain = null, musicGain = null, noiseBuf = null;
  let sfxOn = true, musicOn = true;
  const engines = [];
  let music = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 1 : 0; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.22 : 0; musicGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type = 'square', vol = 0.2, slideTo = null, delay = 0) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, freq = 1000, delay = 0, slideTo = null) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const sfx = {
    select: () => tone(660, 0.07, 'square', 0.12),
    move: () => tone(520, 0.04, 'square', 0.08),
    back: () => tone(330, 0.08, 'square', 0.12),
    join: () => { tone(523, 0.08, 'square', 0.15); tone(784, 0.12, 'square', 0.15, null, 0.08); },
    count: () => tone(440, 0.25, 'square', 0.22),
    go: () => tone(880, 0.6, 'square', 0.22),
    box: () => { tone(900, 0.06, 'triangle', 0.15); tone(1200, 0.08, 'triangle', 0.15, null, 0.05); },
    tick: () => tone(1400, 0.025, 'square', 0.05),
    got: () => { tone(660, 0.07, 'square', 0.15); tone(990, 0.12, 'square', 0.15, null, 0.07); },
    boost: () => { tone(180, 0.6, 'sawtooth', 0.12, 900); noise(0.5, 0.12, 3000, 0, 300); },
    mini: (lvl) => tone(300 + lvl * 150, 0.35, 'sawtooth', 0.1, 1200 + lvl * 200),
    throw: () => tone(320, 0.18, 'triangle', 0.2, 900),
    drop: () => tone(500, 0.15, 'triangle', 0.18, 200),
    hit: () => { tone(700, 0.55, 'square', 0.18, 70); noise(0.3, 0.2, 2000); },
    bump: () => noise(0.12, 0.18, 500),
    explode: () => { noise(1.0, 0.55, 1200, 0, 60); tone(90, 0.8, 'sine', 0.4, 30); },
    lightning: () => { noise(0.7, 0.45, 6000, 0, 200); tone(1500, 0.6, 'sawtooth', 0.12, 100); },
    star: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.12, null, i * 0.06)); },
    ink: () => noise(0.5, 0.25, 600, 0, 150),
    lap: () => { tone(784, 0.1, 'square', 0.15); tone(1046, 0.2, 'square', 0.15, null, 0.1); },
    finalLap: () => { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.14, 'square', 0.16, null, i * 0.1)); },
    finish: () => { [523, 523, 523, 698, 880, 1046].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.12, 'square', 0.18, null, [0, 0.12, 0.24, 0.36, 0.6, 0.84][i])); },
    wall: () => noise(0.15, 0.15, 400),
  };

  function play(name, arg) { if (sfx[name]) sfx[name](arg); }

  // Motores: um oscilador por jogador humano.
  function setEngines(n) {
    stopEngines();
    if (!ctx) return;
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator();
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      f.type = 'lowpass'; f.frequency.value = 600;
      g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxGain);
      o.start(); o2.start();
      engines.push({ o, o2, f, g });
    }
  }
  function engine(i, speedNorm, boosting) {
    const e = engines[i]; if (!e || !ctx) return;
    const t = ctx.currentTime;
    const base = 55 + speedNorm * 110 + (boosting ? 40 : 0);
    e.o.frequency.setTargetAtTime(base, t, 0.05);
    e.o2.frequency.setTargetAtTime(base * 0.5, t, 0.05);
    e.f.frequency.setTargetAtTime(400 + speedNorm * 1400, t, 0.05);
    const vol = (0.03 + Math.min(1, speedNorm) * 0.04) / Math.sqrt(engines.length);
    e.g.gain.setTargetAtTime(sfxOn ? vol : 0, t, 0.08);
  }
  function stopEngines() {
    for (const e of engines) { try { e.o.stop(); e.o2.stop(); e.g.disconnect(); } catch (_) {} }
    engines.length = 0;
  }

  // Música: sequenciador simples (baixo + arpejo + bateria).
  const SONGS = [
    { bpm: 132, root: 60, prog: [0, 7, 9, 5], scale: [0, 4, 7, 12], wave: 'square' },
    { bpm: 120, root: 57, prog: [0, 5, 3, 7], scale: [0, 3, 7, 10], wave: 'triangle' },
    { bpm: 110, root: 62, prog: [0, 9, 5, 7], scale: [0, 4, 7, 11], wave: 'triangle' },
    { bpm: 140, root: 55, prog: [0, 3, 8, 10], scale: [0, 3, 7, 12], wave: 'sawtooth' },
    { bpm: 100, root: 60, prog: [0, 5, 7, 5], scale: [0, 4, 7, 9], wave: 'triangle' },
  ];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function note(freq, t, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(t, kind) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    if (kind === 'k') { f.type = 'lowpass'; f.frequency.value = 150; g.gain.setValueAtTime(0.9, t); }
    else { f.type = 'highpass'; f.frequency.value = kind === 's' ? 1500 : 7000; g.gain.setValueAtTime(kind === 's' ? 0.35 : 0.12, t); }
    g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'h' ? 0.04 : 0.15));
    s.connect(f); f.connect(g); g.connect(musicGain); s.start(t); s.stop(t + 0.2);
  }
  function playMusic(i) {
    stopMusic();
    if (!ctx) return;
    const song = SONGS[i % SONGS.length];
    const stepDur = 60 / song.bpm / 4;
    let step = 0, next = ctx.currentTime + 0.1;
    let seed = i * 977 + 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pattern = Array.from({ length: 16 }, () => Math.floor(rnd() * 4));
    const timer = setInterval(() => {
      if (!ctx) return;
      while (next < ctx.currentTime + 0.15) {
        const bar = Math.floor(step / 16) % song.prog.length;
        const s = step % 16;
        const chordRoot = song.root + song.prog[bar];
        if (s % 2 === 0) note(midi(chordRoot - 24 + (s % 8 === 4 ? 12 : 0)), next, stepDur * 1.8, 'triangle', 0.5);
        if (s % 4 !== 3) note(midi(chordRoot + song.scale[pattern[s]]), next, stepDur * 0.9, song.wave, 0.12);
        if (s % 8 === 0) drum(next, 'k');
        if (s % 8 === 4) drum(next, 's');
        if (s % 2 === 1) drum(next, 'h');
        next += stepDur; step++;
      }
    }, 40);
    music = { timer };
  }
  function stopMusic() { if (music) { clearInterval(music.timer); music = null; } }

  function setSfx(on) { sfxOn = on; if (sfxGain) sfxGain.gain.value = on ? 1 : 0; }
  function setMusic(on) { musicOn = on; if (musicGain) musicGain.gain.value = on ? 0.22 : 0; }

  return {
    init, play, setEngines, engine, stopEngines, playMusic, stopMusic, setSfx, setMusic,
    get sfxOn() { return sfxOn; }, get musicOn() { return musicOn; },
  };
})();
