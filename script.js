/* ==========================================================================
   0. Firebase
   ========================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyC5FKtlCWyec1AxAfwegrxcJyTlR7fLMiE",
  authDomain: "team-fuego-voley.firebaseapp.com",
  databaseURL: "https://team-fuego-voley-default-rtdb.firebaseio.com",
  projectId: "team-fuego-voley",
  storageBucket: "team-fuego-voley.firebasestorage.app",
  messagingSenderId: "327602190796",
  appId: "1:327602190796:web:651f3cc662eaa4942f0569",
  measurementId: "G-NST7Q054NZ"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const colosseumRef = db.ref('marcador_colosseum');
const soldiersRef = db.ref('marcador_refuerzos');
const configRef = db.ref('marcador_refuerzos_config');

const LINK_APP = 'https://luque20013.github.io/TEAM-FUEGO-APPS/'; // cámbialo si esta página tiene otro link
const $ = (id) => document.getElementById(id);
const num = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
const money = (n) => Math.abs(n).toFixed(2);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/* ==========================================================================
   1. Brasas de fondo
   ========================================================================== */
const canvas = $('fireCanvas');
const ctx = canvas.getContext('2d');
let w, h;
const embers = [];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

class Ember {
  constructor() { this.init(); }
  init() {
    this.x = Math.random() * w;
    this.y = h + Math.random() * 20;
    this.size = Math.random() * 3 + 1;
    this.speedY = Math.random() * -1.8 - 0.6;
    this.speedX = (Math.random() - 0.5) * 0.8;
    this.alpha = 1;
    this.decay = Math.random() * 0.008 + 0.004;
    this.color = Math.random() > 0.4 ? '255, 69, 0' : '251, 191, 36';
  }
  update() {
    this.y += this.speedY; this.x += this.speedX; this.alpha -= this.decay;
    if (this.alpha <= 0 || this.y < 0) this.init();
  }
  draw() {
    ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${this.color}, 0.8)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
if (!reduceMotion) {
  for (let i = 0; i < 45; i++) embers.push(new Ember());
  (function animateEmbers() {
    ctx.clearRect(0, 0, w, h);
    embers.forEach((e) => { e.update(); e.draw(); });
    requestAnimationFrame(animateEmbers);
  })();
}

/* ==========================================================================
   2. Sonidos y avisos
   ========================================================================== */
let audioCtx = null;
function playRoarSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'win') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.25);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(); osc.stop(t + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(40, t + 0.2);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.start(); osc.stop(t + 0.2);
    }
  } catch (e) {}
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ==========================================================================
   3. Modo admin (un PIN por sesión) y pestañas
   ========================================================================== */
let esAdmin = false;
let adminNombre = '';
try {
  esAdmin = sessionStorage.getItem('fuegoAdmin') === '1';
  adminNombre = sessionStorage.getItem('fuegoAdminNombre') || '';
} catch (e) {}

// Cada admin entra con su propio PIN
const ADMINS = { '1111': 'Angelo', '2222': 'Yulisa', '3333': 'Ronaldo', '4444': 'Justin' };

function esPinValido(pin) {
  return Object.prototype.hasOwnProperty.call(ADMINS, pin);
}

function aplicarModoAdmin() {
  document.body.classList.toggle('is-admin', esAdmin);
  $('btnAdmin').textContent = esAdmin ? `🔒 ${adminNombre || 'Admin'} · Salir` : '👑 Admin';
  $('btnAdmin').classList.toggle('on', esAdmin);
}

function toggleAdmin() {
  if (esAdmin) {
    esAdmin = false;
    adminNombre = '';
  } else {
    const pin = prompt('PIN de Admin:');
    if (pin === null) return;
    if (!esPinValido(pin)) { alert('⛔ PIN incorrecto.'); return; }
    esAdmin = true;
    adminNombre = ADMINS[pin];
    playRoarSound('win');
    toast(`👑 Hola, ${adminNombre}`);
  }
  try {
    sessionStorage.setItem('fuegoAdmin', esAdmin ? '1' : '0');
    sessionStorage.setItem('fuegoAdminNombre', adminNombre);
  } catch (e) {}
  aplicarModoAdmin();
}

function switchArenaMode(mode) {
  document.querySelectorAll('.tab-nav').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  if (mode === 'colosseum') {
    $('btnTab1').classList.add('active');
    $('screenColosseum').classList.add('active');
  } else {
    $('btnTab2').classList.add('active');
    $('screenHeadhunt').classList.add('active');
  }
}

/* ==========================================================================
   4. Modo 1: 3 equipos en vivo
   ========================================================================== */
let st = null; // estado del triangular que viene de Firebase
const TEAM_COLOR = { A: '#ff5a1f', B: '#fbbf24', C: '#38bdf8' };
let lastKey = null;

colosseumRef.on('value', (snapshot) => {
  const data = snapshot.val();
  st = (data && data.started && data.cRoster) ? data : null;
  $('cWaiting').style.display = st ? 'none' : 'block';
  $('cSetup').style.display = st ? 'none' : 'block';
  $('cMatchArena').style.display = st ? 'block' : 'none';
  $('cStandings').style.display = st ? 'block' : 'none';
  if (st) { renderMatch(); renderStandings(); }
});

function launchTournament() {
  if (!esAdmin) return;
  const bet = num($('cBetVal').value, 20);
  const names = ['cTeamA', 'cTeamB', 'cTeamC'].map((id, i) => $(id).value.trim() || `Equipo ${i + 1}`);
  colosseumRef.set({
    started: true,
    cBet: bet,
    cRoster: {
      A: { name: names[0], pj: 0, pg: 0, pp: 0, cash: 0 },
      B: { name: names[1], pj: 0, pg: 0, pp: 0, cash: 0 },
      C: { name: names[2], pj: 0, pg: 0, pp: 0, cash: 0 }
    },
    currentT1: 'A', currentT2: 'B', currentRest: 'C',
    cRoundNum: 1, cMatchStep: 1
  });
}

function renderMatch() {
  $('cHudRound').textContent = `Ronda ${st.cRoundNum} · Batalla ${st.cMatchStep}/3`;
  $('cName1').textContent = st.cRoster[st.currentT1].name;
  $('cName2').textContent = st.cRoster[st.currentT2].name;
  const pod = $('cRestPod');
  pod.textContent = 'En guardia (Descansa): ';
  pod.appendChild(el('b', '', st.cRoster[st.currentRest].name));
  $('btnUndo').disabled = !(st.historial && st.historial.length);

  $('g1').style.setProperty('--tc', TEAM_COLOR[st.currentT1]);
  $('g2').style.setProperty('--tc', TEAM_COLOR[st.currentT2]);
  pod.style.setProperty('--tc', TEAM_COLOR[st.currentRest]);
  document.querySelectorAll('#cSteps i').forEach((dot, i) => {
    dot.className = i + 1 < st.cMatchStep ? 'done' : (i + 1 === st.cMatchStep ? 'now' : '');
  });

  const key = st.cRoundNum + '-' + st.cMatchStep;
  if (lastKey && key !== lastKey && !reduceMotion) {
    const card = $('cMatchArena');
    card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');
  }
  lastKey = key;
}

$('g1').addEventListener('click', () => { if (st) ejecutarVictoria(st.currentT1, st.currentT2); });
$('g2').addEventListener('click', () => { if (st) ejecutarVictoria(st.currentT2, st.currentT1); });

// Esquema de rondas: cada equipo juega 2 sets por ronda y nunca 3 seguidos
function avanzar(s, winner, loser) {
  const otro = (a, b) => ['A', 'B', 'C'].find((k) => k !== a && k !== b);
  const set = (t1, t2, rest, step, round) => {
    s.currentT1 = t1; s.currentT2 = t2; s.currentRest = rest;
    if (step) s.cMatchStep = step;
    if (round) s.cRoundNum = round;
  };
  const R = s.cRoundNum, S = s.cMatchStep;
  const parActual = [s.currentT1, s.currentT2];
  let parPrevio = s.lastPair || null;   // pareja del set anterior
  s.lastPair = parActual;               // se guarda para el siguiente set

  if (R === 1) {
    if (S === 1) {
      s.winP1 = winner; s.loseP1 = loser;
      set(winner, otro(s.currentT1, s.currentT2), loser, 2);
    } else if (S === 2) {
      set(s.loseP1, otro(s.winP1, s.loseP1), s.winP1, 3);
    } else {
      set('B', 'A', 'C', 1, 2);
    }
  } else {
    // Torneo iniciado con la version anterior: reconstruir el set anterior (ultimo de la ronda 1)
    if (!parPrevio && R === 2 && S === 1 && s.loseP1) parPrevio = [s.loseP1, s.currentRest];
    // Descansa el que jugo los dos sets anteriores; entran los otros dos
    let descansa = parPrevio ? parActual.find((k) => parPrevio.includes(k)) : null;
    if (!descansa) descansa = s.currentT2;
    const sigue = parActual.find((k) => k !== descansa);
    const entra = s.currentRest;
    set(sigue, entra, descansa, S < 3 ? S + 1 : 1, S < 3 ? R : R + 1);
  }
}

function ejecutarVictoria(winner, loser) {
  if (!esAdmin || !st) return;
  const esperado = { t1: st.currentT1, t2: st.currentT2, r: st.cRoundNum, s: st.cMatchStep };

  // La transacción evita dobles toques o que dos admins registren el mismo set
  colosseumRef.transaction((cur) => {
    if (!cur || !cur.started) return;
    if (cur.currentT1 !== esperado.t1 || cur.currentT2 !== esperado.t2 ||
        cur.cRoundNum !== esperado.r || cur.cMatchStep !== esperado.s) return;

    const { historial, ...previo } = cur;
    const nuevo = JSON.parse(JSON.stringify(previo));
    const bet = nuevo.cBet;
    const W = nuevo.cRoster[winner], L = nuevo.cRoster[loser];
    W.cash += bet; L.cash -= bet;
    W.pj += 1; L.pj += 1; W.pg += 1; L.pp += 1;

    nuevo.log = [...(previo.log || []), { r: cur.cRoundNum, s: cur.cMatchStep, w: W.name, l: L.name }].slice(-30);
    avanzar(nuevo, winner, loser);
    nuevo.historial = [...(historial || []), previo].slice(-15);
    return nuevo;
  }, (error, committed) => {
    if (error) { toast('⚠️ No se pudo guardar. Revisa tu conexión.'); return; }
    if (!committed) { toast('Ese set ya estaba registrado.'); return; }
    playRoarSound('win');
    toast(`🏆 ${st ? st.cRoster[winner].name : 'Equipo'} se lleva el set`);
  });
}

function deshacerUltimo() {
  if (!esAdmin) return;
  if (!confirm('¿Deshacer el último set registrado?')) return;
  colosseumRef.transaction((cur) => {
    if (!cur || !cur.historial || !cur.historial.length) return;
    const hist = cur.historial.slice();
    const previo = hist.pop();
    previo.historial = hist;
    previo.started = true;
    return previo;
  }, (error, committed) => {
    if (committed) { playRoarSound('lose'); toast('↩️ Último set deshecho'); }
  });
}

function equiposOrdenados() {
  return Object.entries(st.cRoster).map(([key, t]) => ({ ...t, key })).sort((a, b) => (b.cash - a.cash) || (b.pg - a.pg));
}

function estadoEquipo(team) {
  if (team.cash > 0) return `GANA (+S/ ${money(team.cash)})`;
  if (team.cash < 0) return `DEBE (-S/ ${money(team.cash)})`;
  return 'S/ 0.00';
}

function renderStandings() {
  const tbody = $('cTableBody');
  tbody.innerHTML = '';
  equiposOrdenados().forEach((team, i) => {
    const tr = el('tr', i === 0 && team.cash > 0 ? 'leader' : '');
    tr.style.setProperty('--tc', TEAM_COLOR[team.key]);
    const c1 = el('td');
    c1.appendChild(el('span', 'rank', i + 1));
    c1.appendChild(el('b', '', `${i === 0 && team.cash > 0 ? '👑 ' : ''}${team.name}`));
    const cl = team.cash > 0 ? 'val-positive' : (team.cash < 0 ? 'val-negative' : 'val-neutral');
    const c5 = el('td', cl, `${team.cash > 0 ? '+' : team.cash < 0 ? '-' : ''}S/ ${money(team.cash)}`);
    c5.style.textAlign = 'right';
    tr.append(c1, el('td', '', team.pj), el('td', '', team.pg), el('td', '', team.pp), c5);
    tbody.appendChild(tr);
  });

  const log = $('cLog');
  log.innerHTML = '';
  const entradas = (st.log || []).slice(-6).reverse();
  if (!entradas.length) {
    log.appendChild(el('li', '', 'Todavía no se jugó ningún set.'));
  }
  entradas.forEach((e) => {
    const li = el('li');
    li.append(`R${e.r} · B${e.s}: `, el('b', '', e.w), ' venció a ', el('b', '', e.l));
    log.appendChild(li);
  });
}

function resetTournament() {
  if (!esAdmin) return;
  if (confirm('¿Reiniciar todo el triangular? Se borran las cuentas y el historial.')) colosseumRef.remove();
}

function abrirWhatsApp(mensaje) {
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function compartirTablaWhatsApp() {
  if (!esAdmin || !st) return;
  const medallas = ['🥇', '🥈', '🥉'];
  const filas = equiposOrdenados()
    .map((t, i) => `${medallas[i]} *${t.name}* · ${t.pg}G/${t.pp}P ➔ *${estadoEquipo(t)}*`)
    .join('\n');

  abrirWhatsApp(
`🔥🦁 *TEAM FUEGO · MARCADOR* 🦁🔥
🏐 Ronda ${st.cRoundNum} · Batalla ${st.cMatchStep}/3
💰 Bolsa por partido: S/ ${st.cBet.toFixed(2)}

${filas}

▶️ Ahora juegan: *${st.cRoster[st.currentT1].name}* vs *${st.cRoster[st.currentT2].name}*
⏸️ Descansa: ${st.cRoster[st.currentRest].name}

👉 ${LINK_APP}`);
}

/* ==========================================================================
   5. Modo 2: Individual / refuerzos en vivo
   ========================================================================== */
let soldiers = {};
let fee = 3, lateFee = 2;
const NUM_GRUPOS = 6; // cantidad de grupos disponibles para elegir

// Los montos se guardan en Firebase para que todos vean la misma liquidación
configRef.on('value', (snapshot) => {
  const c = snapshot.val() || {};
  fee = num(c.fee, 3);
  lateFee = num(c.lateFee, 2);
  if (document.activeElement !== $('pFee')) $('pFee').value = fee;
  if (document.activeElement !== $('pLateFee')) $('pLateFee').value = lateFee;
  $('pFeeInfo').textContent = `Set perdido: S/ ${fee.toFixed(2)} · Tardanza: S/ ${lateFee.toFixed(2)}`;
  refreshRoster();
});

function guardarConfig() {
  if (!esAdmin) return;
  configRef.set({ fee: num($('pFee').value, 3), lateFee: num($('pLateFee').value, 2) });
}
$('pFee').addEventListener('change', guardarConfig);
$('pLateFee').addEventListener('change', guardarConfig);

soldiersRef.on('value', (snapshot) => {
  soldiers = snapshot.val() || {};
  refreshRoster();
});

function enlistPlayer() {
  if (!esAdmin) return;
  const field = $('pInputName');
  const tag = field.value.trim();
  if (!tag) return;
  soldiersRef.push({ tag, w: 0, l: 0, late: false }).then(() => {
    field.value = '';
    playRoarSound('win');
  });
}
$('pInputName').addEventListener('keydown', (e) => { if (e.key === 'Enter') enlistPlayer(); });

function modifyCombatRecord(id, outcome) {
  if (!esAdmin || !soldiers[id]) return;
  const campo = outcome === 'w' ? 'w' : 'l';
  // increment atómico: no se pierden toques si dos admins registran a la vez
  soldiersRef.child(id).child(campo).transaction((v) => (v || 0) + 1, (err, ok) => {
    if (ok) playRoarSound(outcome === 'w' ? 'win' : 'lose');
  });
}

function restarRegistro(id, outcome) {
  if (!esAdmin || !soldiers[id]) return;
  const campo = outcome === 'w' ? 'w' : 'l';
  soldiersRef.child(id).child(campo).transaction((v) => Math.max((v || 0) - 1, 0));
}

function toggleLate(id) {
  if (!esAdmin || !soldiers[id]) return;
  const nuevo = !soldiers[id].late;
  soldiersRef.child(id).update({ late: nuevo }).then(() => playRoarSound(nuevo ? 'lose' : 'win'));
}

function removePlayer(id) {
  if (!esAdmin || !soldiers[id]) return;
  if (confirm(`¿Quitar a ${soldiers[id].tag}?`)) soldiersRef.child(id).remove();
}

function asignarGrupo(id, valor) {
  if (!esAdmin || !soldiers[id]) return;
  const g = parseInt(valor, 10);
  if (g) soldiersRef.child(id).update({ g });
  else soldiersRef.child(id).child('g').remove();
}

// Un toque suma/resta a todos los del grupo (cada jugador sigue teniendo sus botones propios)
function accionGrupo(g, campo, delta) {
  if (!esAdmin) return;
  const ids = Object.keys(soldiers).filter((id) => soldiers[id].g === g);
  if (!ids.length) return;
  ids.forEach((id) => {
    soldiersRef.child(id).child(campo).transaction((v) => Math.max((v || 0) + delta, 0));
  });
  playRoarSound(campo === 'w' ? 'win' : 'lose');
  toast(`Grupo ${g}: ${delta > 0 ? '+' : '−'}1 set ${campo === 'w' ? 'ganado' : 'perdido'} (${ids.length} jugadores)`);
}

let numeros = {}; // id -> número fijo según orden de inscripción
const numeroDe = (id) => numeros[id] || '';

function renderGrupos(keysControl) {
  const panel = $('groupPanel');
  panel.innerHTML = '';
  for (let g = 1; g <= NUM_GRUPOS; g++) {
    const ids = keysControl.filter((id) => soldiers[id].g === g);
    if (!ids.length) continue;
    const card = el('div', 'mercenary-card group-card');
    card.appendChild(el('div', 'roster-group-title', `Grupo ${g} · ${ids.length} jugadores`));
    card.appendChild(el('p', 'group-names', ids.map((id) => `${numeroDe(id)}. ${soldiers[id].tag}`).join(' · ')));
    const ctrls = el('div', 'mercenary-controls');
    const bw = el('button', 'btn-score-ctrl win', '+ Set ganado (todos)');
    bw.onclick = () => accionGrupo(g, 'w', 1);
    const bl = el('button', 'btn-score-ctrl lose', '+ Set perdido (todos)');
    bl.onclick = () => accionGrupo(g, 'l', 1);
    const bu1 = el('button', 'btn-score-ctrl late', '− Ganado (todos)');
    bu1.onclick = () => accionGrupo(g, 'w', -1);
    const bu2 = el('button', 'btn-score-ctrl late', '− Perdido (todos)');
    bu2.onclick = () => accionGrupo(g, 'l', -1);
    ctrls.append(bw, bl, bu1, bu2);
    card.appendChild(ctrls);
    panel.appendChild(card);
  }
}

function saldoNeto(s) {
  return (s.w - s.l) * fee - (s.late ? lateFee : 0);
}

function refreshRoster() {
  const list = $('playerRoster');
  const report = $('pTableReport');
  list.innerHTML = '';
  report.innerHTML = '';
  $('groupPanel').innerHTML = '';

  // Control: orden fijo (orden de inscripción) para que las tarjetas no se muevan al tocar
  const keysControl = Object.keys(soldiers).sort();
  // Liquidación: ordenada por saldo
  const keys = Object.keys(soldiers).sort((a, b) => saldoNeto(soldiers[b]) - saldoNeto(soldiers[a]));

  if (!keys.length) {
    const p = el('p', '', 'No hay jugadores registrados. Agrega uno arriba.');
    p.style.cssText = 'font-size:.8rem;color:var(--text-dim);text-align:center;padding:.8rem 0;';
    list.appendChild(p);
    const tr = el('tr'); const td = el('td', '', 'Sin datos registrados');
    td.colSpan = 4; td.style.cssText = 'text-align:center;color:var(--text-dim);font-size:.8rem;';
    tr.appendChild(td); report.appendChild(tr);
    return;
  }

  numeros = {};
  keysControl.forEach((id, i) => { numeros[id] = i + 1; });
  renderGrupos(keysControl);

  keysControl.forEach((id) => {
    const s = soldiers[id];

    // Tarjeta de control (solo admins la ven)
    const net0 = saldoNeto(s);
    const card = el('div', 'mercenary-card ' + (net0 > 0 ? 'pos' : net0 < 0 ? 'neg' : ''));
    const head = el('div', 'mercenary-header');
    const av = el('span', 'merc-av', (s.tag || '?').trim().charAt(0).toUpperCase());
    const meta = el('div', 'mercenary-meta');
    meta.appendChild(el('b', '', `${numeroDe(id)}. 🦁 ${s.tag}`));
    meta.appendChild(el('span', '', `${s.w} Ganados · ${s.l} Perdidos${s.late ? ' · ⚠️ Tardanza' : ''}`));
    const rm = el('button', 'btn-remove-player', '✕');
    rm.title = 'Eliminar'; rm.setAttribute('aria-label', 'Eliminar jugador');
    rm.onclick = () => removePlayer(id);
    const sel = el('select', 'group-select');
    sel.setAttribute('aria-label', 'Grupo de ' + s.tag);
    const o0 = el('option', '', 'Sin grupo'); o0.value = '';
    sel.appendChild(o0);
    for (let g = 1; g <= NUM_GRUPOS; g++) { const o = el('option', '', 'Grupo ' + g); o.value = g; sel.appendChild(o); }
    sel.value = s.g ? String(s.g) : '';
    sel.onchange = () => asignarGrupo(id, sel.value);
    head.append(av, meta, sel, rm);

    const ctrls = el('div', 'mercenary-controls');
    const bw = el('button', 'btn-score-ctrl win', '+ Set ganado');
    bw.onclick = () => modifyCombatRecord(id, 'w');
    const bl = el('button', 'btn-score-ctrl lose', '+ Set perdido');
    bl.onclick = () => modifyCombatRecord(id, 'l');
    const bt = el('button', 'btn-score-ctrl late' + (s.late ? ' is-late' : ''), s.late ? `⏰ Tardanza (S/ ${lateFee.toFixed(2)}) ✅` : '⏰ Marcar tardanza');
    bt.onclick = () => toggleLate(id);
    const bu1 = el('button', 'btn-score-ctrl late', '− Ganado');
    bu1.title = 'Quitar un set ganado registrado por error';
    bu1.onclick = () => restarRegistro(id, 'w');
    const bu2 = el('button', 'btn-score-ctrl late', '− Perdido');
    bu2.title = 'Quitar un set perdido registrado por error';
    bu2.onclick = () => restarRegistro(id, 'l');
    ctrls.append(bw, bl, bt, bu1, bu2);
    card.append(head, ctrls);
    list.appendChild(card);
  });

  keys.forEach((id) => {
    const s = soldiers[id];

    // Fila de liquidación (todos la ven)
    const net = saldoNeto(s);
    const cl = net > 0 ? 'val-positive' : (net < 0 ? 'val-negative' : 'val-neutral');
    const estado = net > 0 ? `GANA S/ ${money(net)}` : (net < 0 ? `DEBE S/ ${money(net)}` : 'S/ 0.00');

    const tr = el('tr');
    const c1 = el('td'); c1.appendChild(el('b', '', s.tag));
    const c3 = el('td');
    if (s.late) { const sp = el('span', '', `+S/ ${lateFee.toFixed(2)}`); sp.style.cssText = 'color:var(--crimson-lose);font-weight:bold;'; c3.appendChild(sp); }
    else { const sp = el('span', '', '-'); sp.style.color = 'var(--text-dim)'; c3.appendChild(sp); }
    const c4 = el('td', cl, estado); c4.style.textAlign = 'right';
    tr.append(c1, el('td', '', `${s.w}G / ${s.l}P`), c3, c4);
    report.appendChild(tr);
  });
}

function resetSoldiers() {
  if (!esAdmin) return;
  if (confirm('¿Reiniciar todas las cuentas individuales?')) soldiersRef.remove();
}

function compartirRefuerzosWhatsApp() {
  if (!esAdmin) return;
  const keys = Object.keys(soldiers).sort((a, b) => saldoNeto(soldiers[b]) - saldoNeto(soldiers[a]));
  if (!keys.length) { alert('No hay jugadores registrados.'); return; }

  const reporte = keys.map((id) => {
    const s = soldiers[id];
    const net = saldoNeto(s);
    const estado = net > 0 ? `GANA S/ ${money(net)}` : (net < 0 ? `DEBE S/ ${money(net)}` : 'S/ 0.00');
    return `${net > 0 ? '🟢' : net < 0 ? '🔴' : '⚪'} *${s.tag}* · ${s.w}G/${s.l}P${s.late ? ' · ⏰ tardanza' : ''} ➔ *${estado}*`;
  }).join('\n');

  abrirWhatsApp(
`⚔️🏐 *TEAM FUEGO · LIQUIDACIÓN INDIVIDUAL* 🔥
💰 Set perdido: S/ ${fee.toFixed(2)}
⏰ Tardanza (después de 8:15 PM): S/ ${lateFee.toFixed(2)}

${reporte}

Quien debe, yapea al ganador o a un admin. 🦁
👉 ${LINK_APP}`);
}

aplicarModoAdmin();
