/* ==========================================================================
   0. Firebase
   ========================================================================== */
const firebaseConfig = window.ICEFIRE.firebase;
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const colosseumRef = db.ref('marcador_colosseum');
const cuatroRef = db.ref('marcador_cuatro');
const playersRef = db.ref('marcador_cuatro_jugadores'); // jugadores con posición y equipo
const soldiersRef = db.ref('marcador_refuerzos');
const configRef = db.ref('marcador_refuerzos_config');

const LINK_APP = new URL('./', location.href).href; // se arma solo con el link donde publiques la app
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
  esAdmin = sessionStorage.getItem('icefireAdmin') === '1';
  adminNombre = sessionStorage.getItem('icefireAdminNombre') || '';
} catch (e) {}

// Cada admin entra con su propio PIN
const ADMINS = window.ICEFIRE.admins; // se editan en config.js

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
    sessionStorage.setItem('icefireAdmin', esAdmin ? '1' : '0');
    sessionStorage.setItem('icefireAdminNombre', adminNombre);
  } catch (e) {}
  aplicarModoAdmin();
}

function switchArenaMode(mode) {
  document.querySelectorAll('.tab-nav').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  if (mode === 'colosseum') {
    $('btnTab1').classList.add('active');
    $('screenColosseum').classList.add('active');
  } else if (mode === 'cuatro') {
    $('btnTab3').classList.add('active');
    $('screenCuatro').classList.add('active');
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
`❄️🔥 *ICEFIRE · MARCADOR* 🔥❄️
🏐 Ronda ${st.cRoundNum} · Batalla ${st.cMatchStep}/3
💰 Bolsa por partido: S/ ${st.cBet.toFixed(2)}

${filas}

▶️ Ahora juegan: *${st.cRoster[st.currentT1].name}* vs *${st.cRoster[st.currentT2].name}*
⏸️ Descansa: ${st.cRoster[st.currentRest].name}

👉 ${LINK_APP}`);
}

/* ==========================================================================
   4b. Modo 4 equipos: todos contra todos (6 partidos, una bolsa por partido)
   ========================================================================== */
const Q_KEYS = ['A', 'B', 'C', 'D'];
const Q_COLOR = { A: '#ff5a1f', B: '#fbbf24', C: '#38bdf8', D: '#a78bfa' };
// Orden de los 6 partidos: cada equipo juega 3 veces y nunca contra el mismo dos veces
const Q_FIXTURES = [['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D'], ['A', 'D'], ['B', 'C']];
// ---------- Jugadores, posiciones y equipos (4 equipos) ----------
let qPlayers = {}; // { id: { name, pos, team } }
const Q_POS = Object.keys(window.ICEFIRE.posiciones);
const qAbrev = (p) => (p ? p.slice(0, 3).toUpperCase() : '');
const qNivel = (p) => parseInt(p.nivel, 10) || 3; // sin nivel cuenta como 3 al repartir
const qPosOrden = (p) => { const i = Q_POS.indexOf(p); return i < 0 ? 99 : i; };
const Q_PUNTO = { A: '🟠', B: '🟡', C: '🔵', D: '🟣' };

playersRef.on('value', (snapshot) => { qPlayers = snapshot.val() || {}; renderEquipos(); });

function qTeamName(k) {
  if (q) return q.roster[k].name;
  const inp = $('qTeam' + k);
  return (inp && inp.value.trim()) || `Equipo ${Q_KEYS.indexOf(k) + 1}`;
}

// Jugadores de un equipo, agrupados por posición y luego por nombre
function qPorEquipo(k) {
  return Object.entries(qPlayers)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => (p.team || '') === k)
    .sort((a, b) => qPosOrden(a.pos) - qPosOrden(b.pos) || a.name.localeCompare(b.name));
}

function renderEquipos() {
  const ids = Object.keys(qPlayers);
  const hayEquipos = ids.some((id) => qPlayers[id].team);
  $('qTeamsView').style.display = hayEquipos ? 'block' : 'none';

  const grid = $('qTeams');
  grid.innerHTML = '';
  Q_KEYS.forEach((k) => {
    const lista = qPorEquipo(k);
    const card = el('div', 'q-team');
    card.style.setProperty('--tc', Q_COLOR[k]);
    const h4 = el('h4', '', `${qTeamName(k)} · ${lista.length}`);
    if (lista.length) h4.appendChild(el('small', 'q-prom', ` ⌀${(lista.reduce((t, p) => t + qNivel(p), 0) / lista.length).toFixed(1)}`));
    card.appendChild(h4);
    if (!lista.length) card.appendChild(el('p', 'q-empty', 'Sin jugadores'));
    lista.forEach((p) => {
      const row = el('div', 'q-pl');
      row.appendChild(el('span', '', p.name));
      const der = el('span', 'q-der');
      if (p.nivel) der.appendChild(el('span', 'q-nv', `★${p.nivel}`));
      if (p.pos) {
        const b = el('span', 'q-pos', qAbrev(p.pos));
        b.style.setProperty('--pc', window.ICEFIRE.posiciones[p.pos] || '#999');
        der.appendChild(b);
      }
      row.appendChild(der);
      card.appendChild(row);
    });
    grid.appendChild(card);
  });

  renderPool();
  renderLineups();
}

// Panel del admin: una fila por jugador con su posición y su equipo
function renderPool() {
  const box = $('qPool');
  box.innerHTML = '';
  const ids = Object.keys(qPlayers).sort((a, b) => qPlayers[a].name.localeCompare(qPlayers[b].name));
  if (!ids.length) {
    box.appendChild(el('p', 'fee-info', 'Todavía no hay jugadores. Pega la lista de WhatsApp o agrégalos a mano.'));
    return;
  }
  const sin = ids.filter((id) => !qPlayers[id].team).length;
  box.appendChild(el('p', 'fee-info', `${ids.length} jugadores · ${sin} sin equipo`));
  ids.forEach((id) => {
    const p = qPlayers[id];
    const row = el('div', 'q-row');
    row.appendChild(el('b', '', p.name));

    const selPos = el('select');
    selPos.setAttribute('aria-label', 'Posición de ' + p.name);
    [['', 'Posición']].concat(Q_POS.map((x) => [x, x])).forEach(([v, t]) => {
      const o = el('option', '', t); o.value = v; if ((p.pos || '') === v) o.selected = true; selPos.appendChild(o);
    });
    selPos.addEventListener('change', () => { if (esAdmin) playersRef.child(id).update({ pos: selPos.value }); });

    const selNivel = el('select');
    selNivel.setAttribute('aria-label', 'Nivel de ' + p.name);
    [['', 'Nivel'], ['1', '★1'], ['2', '★2'], ['3', '★3'], ['4', '★4'], ['5', '★5']].forEach(([v, t]) => {
      const o = el('option', '', t); o.value = v; if (String(p.nivel || '') === v) o.selected = true; selNivel.appendChild(o);
    });
    selNivel.addEventListener('change', () => { if (esAdmin) playersRef.child(id).update({ nivel: selNivel.value }); });

    const selTeam = el('select');
    selTeam.setAttribute('aria-label', 'Equipo de ' + p.name);
    [['', 'Sin equipo']].concat(Q_KEYS.map((k) => [k, `${Q_PUNTO[k]} ${qTeamName(k)}`])).forEach(([v, t]) => {
      const o = el('option', '', t); o.value = v; if ((p.team || '') === v) o.selected = true; selTeam.appendChild(o);
    });
    selTeam.addEventListener('change', () => { if (esAdmin) playersRef.child(id).update({ team: selTeam.value }); });

    const del = el('button', 'q-del', '✕');
    del.setAttribute('aria-label', 'Quitar a ' + p.name);
    del.addEventListener('click', () => { if (esAdmin && confirm(`¿Quitar a ${p.name}?`)) playersRef.child(id).remove(); });

    row.append(selPos, selNivel, selTeam, del);
    box.appendChild(row);
  });
}

// En el partido en juego, se ven los jugadores de los dos equipos
function renderLineups() {
  const box = $('qLineups');
  box.innerHTML = '';
  if (!q || q.idx >= Q_FIXTURES.length) return;
  Q_FIXTURES[q.idx].forEach((k) => {
    const col = el('div', 'q-lineup');
    col.style.setProperty('--tc', Q_COLOR[k]);
    qPorEquipo(k).forEach((p) => col.appendChild(el('span', '', p.name + (p.pos ? ` · ${qAbrev(p.pos)}` : ''))));
    box.appendChild(col);
  });
}

// Lee nombres de una lista pegada de WhatsApp (1️⃣ 🔥 Yuli💵) o de un nombre por línea
function nombresDeTexto(txt) {
  const limpiar = (l) => l
    .replace(/^[\s\d\uFE0F\u20E3\p{Extended_Pictographic}.)\-]+/u, '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u20E3]/gu, '')
    .replace(/\s+/g, ' ').trim().slice(0, 24);
  const lineas = txt.split(/\r?\n/);
  const numeradas = lineas.filter((l) => /^\s*(?:\d\uFE0F?\u20E3|\u{1F51F}|\d+\s*[.)\-])/u.test(l));
  const fuente = numeradas.length ? numeradas : lineas.filter((l) => l.trim() && l.trim().length <= 30);
  return fuente.map(limpiar).filter(Boolean);
}

function agregarNombres(nombres) {
  const existe = new Set(Object.values(qPlayers).map((p) => p.name.toLowerCase()));
  const updates = {};
  let n = 0;
  nombres.forEach((nombre) => {
    if (existe.has(nombre.toLowerCase())) return;
    existe.add(nombre.toLowerCase());
    updates[playersRef.push().key] = { name: nombre, pos: '', team: '', t: Date.now() };
    n++;
  });
  if (!n) { toast('No encontré nombres nuevos.'); return Promise.resolve(0); }
  return playersRef.update(updates).then(() => { toast(`✅ ${n} jugadores cargados`); return n; });
}

function cargarNombres() {
  if (!esAdmin) return;
  const nombres = nombresDeTexto($('qPaste').value);
  if (!nombres.length) { toast('No encontré nombres en ese texto.'); return; }
  agregarNombres(nombres).then((n) => { if (n) $('qPaste').value = ''; });
}

function agregarJugador() {
  if (!esAdmin) return;
  const nombre = $('qNewName').value.trim().slice(0, 24);
  if (!nombre) return;
  agregarNombres([nombre]).then(() => { $('qNewName').value = ''; });
}

// Reparte a todos en los 4 equipos: mismo tamaño, posiciones parecidas y nivel parejo
function repartirEquipos() {
  if (!esAdmin) return;
  const ids = Object.keys(qPlayers);
  if (ids.length < 4) { alert('Carga primero a los jugadores.'); return; }
  if (ids.some((id) => qPlayers[id].team) && !confirm('Ya hay jugadores con equipo. ¿Repartir de nuevo?')) return;

  const mezclar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const grupos = {};
  mezclar(ids.slice()).forEach((id) => { const p = qPlayers[id].pos || ''; (grupos[p] = grupos[p] || []).push(id); });

  const total = { A: 0, B: 0, C: 0, D: 0 };
  const sumaNivel = { A: 0, B: 0, C: 0, D: 0 };
  const porPos = { A: {}, B: {}, C: {}, D: {} };
  const updates = {};
  Object.keys(grupos).sort((a, b) => qPosOrden(a) - qPosOrden(b)).forEach((pos) => {
    grupos[pos].sort((a, b) => qNivel(qPlayers[b]) - qNivel(qPlayers[a])).forEach((id) => {
      const min = Math.min(...Q_KEYS.map((k) => total[k]));
      const menores = Q_KEYS.filter((k) => total[k] === min);
      const minPos = Math.min(...menores.map((k) => porPos[k][pos] || 0));
      const conMenosPos = menores.filter((k) => (porPos[k][pos] || 0) === minPos);
      const minNivel = Math.min(...conMenosPos.map((k) => sumaNivel[k]));
      const finales = conMenosPos.filter((k) => sumaNivel[k] === minNivel);
      const k = finales[Math.floor(Math.random() * finales.length)];
      total[k]++;
      sumaNivel[k] += qNivel(qPlayers[id]);
      porPos[k][pos] = (porPos[k][pos] || 0) + 1;
      updates[id + '/team'] = k;
    });
  });
  playersRef.update(updates).then(() => toast('🎲 Equipos repartidos'));
}

function limpiarEquipos() {
  if (!esAdmin) return;
  const ids = Object.keys(qPlayers);
  if (!ids.length || !confirm('¿Sacar a todos los jugadores de sus equipos?')) return;
  const updates = {};
  ids.forEach((id) => { updates[id + '/team'] = ''; });
  playersRef.update(updates);
}

function vaciarJugadores() {
  if (!esAdmin) return;
  if (confirm('¿Borrar a TODOS los jugadores de esta lista?')) playersRef.remove();
}

function compartirEquiposWhatsApp() {
  if (!esAdmin) return;
  const bloques = Q_KEYS.map((k) => {
    const l = qPorEquipo(k);
    const prom = l.length ? ` · nivel ${(l.reduce((t, p) => t + qNivel(p), 0) / l.length).toFixed(1)}` : '';
    return `${Q_PUNTO[k]} *${qTeamName(k)}* (${l.length}${prom})\n` + (l.length ? l.map((p) => `• ${p.name}${p.pos ? ' · ' + p.pos : ''}`).join('\n') : '• —');
  }).join('\n\n');
  abrirWhatsApp(
`❄️🔥 *ICEFIRE · EQUIPOS DE HOY* 🔥❄️
🏐 Todos contra todos · 4 equipos

${bloques}

👉 ${LINK_APP}`);
}

let q = null; // estado que viene de Firebase
let qLastIdx = null;

cuatroRef.on('value', (snapshot) => {
  const d = snapshot.val();
  q = (d && d.started && d.roster) ? d : null;
  const fin = !!q && q.idx >= Q_FIXTURES.length;
  $('qWaiting').style.display = q ? 'none' : 'block';
  $('qSetup').style.display = q ? 'none' : 'block';
  $('qMatchArena').style.display = q && !fin ? 'block' : 'none';
  $('qDone').style.display = fin ? 'block' : 'none';
  $('qStandings').style.display = q ? 'block' : 'none';
  if (q) renderCuatro();
  renderEquipos();
});

function launchCuatro() {
  if (!esAdmin) return;
  const bet = num($('qBetVal').value, 20);
  const per = Math.max(1, Math.round(num($('qPerTeam').value, 6)));
  const names = ['qTeamA', 'qTeamB', 'qTeamC', 'qTeamD'].map((id, i) => $(id).value.trim() || `Equipo ${i + 1}`);
  const roster = {};
  Q_KEYS.forEach((k, i) => { roster[k] = { name: names[i], pj: 0, pg: 0, pp: 0, cash: 0 }; });
  cuatroRef.set({ started: true, bet, per, roster, idx: 0 });
}

const qNames = (keys) => keys.map((k) => q.roster[k].name).join(' y ');

// Orden de la tabla: más ganados; si empatan, quién ganó entre los empatados; luego nombre
function qOrdenados() {
  const arr = Object.entries(q.roster).map(([key, t]) => ({ ...t, key }));
  const res = q.results || [];
  const h2h = (x, grupo) => res.filter((r) => r.w === x.key && grupo.some((g) => g.key === r.l)).length;
  return arr.sort((x, y) => {
    if (y.pg !== x.pg) return y.pg - x.pg;
    const grupo = arr.filter((t) => t.pg === x.pg);
    return (h2h(y, grupo) - h2h(x, grupo)) || x.name.localeCompare(y.name);
  });
}

// Pagos mínimos: los que deben le pagan a los que ganan (en centavos para no perder decimales)
function qPagos() {
  const deb = [], cre = [];
  Object.values(q.roster).forEach((t) => {
    const c = Math.round(t.cash * 100);
    if (c < 0) deb.push({ name: t.name, c: -c });
    else if (c > 0) cre.push({ name: t.name, c });
  });
  deb.sort((a, b) => b.c - a.c);
  cre.sort((a, b) => b.c - a.c);
  const out = [];
  let i = 0, j = 0;
  while (i < deb.length && j < cre.length) {
    const m = Math.min(deb[i].c, cre[j].c);
    out.push({ de: deb[i].name, a: cre[j].name, monto: m / 100 });
    deb[i].c -= m;
    cre[j].c -= m;
    if (deb[i].c === 0) i++;
    if (cre[j].c === 0) j++;
  }
  return out;
}

const qSigno = (n) => (n > 0 ? '+' : n < 0 ? '-' : '');

function renderCuatro() {
  const total = Q_FIXTURES.length;
  const fin = q.idx >= total;
  const per = q.per || 6;

  if (!fin) {
    const [a, b] = Q_FIXTURES[q.idx];
    $('qHud').textContent = `Partido ${q.idx + 1}/${total}`;
    $('qName1').textContent = q.roster[a].name;
    $('qName2').textContent = q.roster[b].name;
    $('q1').style.setProperty('--tc', Q_COLOR[a]);
    $('q2').style.setProperty('--tc', Q_COLOR[b]);

    const descansan = Q_KEYS.filter((k) => k !== a && k !== b);
    const rest = $('qRestPod');
    rest.textContent = 'Descansan: ';
    rest.appendChild(el('b', '', qNames(descansan)));

    const next = $('qNextPod');
    next.textContent = 'Sigue: ';
    if (q.idx + 1 < total) {
      const [c, d] = Q_FIXTURES[q.idx + 1];
      next.appendChild(el('b', '', `${q.roster[c].name} vs ${q.roster[d].name}`));
    } else {
      next.appendChild(el('b', '', 'es el último partido'));
    }

    const steps = $('qSteps');
    steps.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = el('i', i < q.idx ? 'done' : (i === q.idx ? 'now' : ''));
      steps.appendChild(dot);
    }
    $('qBtnUndo').disabled = !(q.historial && q.historial.length);

    if (qLastIdx !== null && qLastIdx !== q.idx && !reduceMotion) {
      const card = $('qMatchArena');
      card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');
    }
    qLastIdx = q.idx;
  }

  const orden = qOrdenados();
  if (fin) {
    const top = orden[0];
    $('qChamp').textContent = `🏆 Campeón: ${top.name} (${top.pg} ganados)`;
  }

  const tbody = $('qTableBody');
  tbody.innerHTML = '';
  orden.forEach((team, i) => {
    const tr = el('tr', i === 0 && team.cash > 0 ? 'leader' : '');
    tr.style.setProperty('--tc', Q_COLOR[team.key]);
    const c1 = el('td');
    c1.appendChild(el('span', 'rank', i + 1));
    c1.appendChild(el('b', '', `${i === 0 && team.cash > 0 ? '👑 ' : ''}${team.name}`));
    const cl = team.cash > 0 ? 'val-positive' : (team.cash < 0 ? 'val-negative' : 'val-neutral');
    const c5 = el('td', cl, `${qSigno(team.cash)}S/ ${money(team.cash)}`);
    c5.style.textAlign = 'right';
    c5.appendChild(el('small', '', `c/u ${qSigno(team.cash)}S/ ${money(team.cash / per)}`));
    tr.append(c1, el('td', '', team.pj), el('td', '', team.pg), el('td', '', team.pp), c5);
    tbody.appendChild(tr);
  });

  const pays = $('qPays');
  pays.innerHTML = '';
  const pagos = qPagos();
  if (!pagos.length) pays.appendChild(el('li', '', 'Todavía no hay cuentas pendientes.'));
  pagos.forEach((p) => {
    const li = el('li');
    li.append(el('b', '', p.de), ' le paga S/ ' + money(p.monto) + ' a ', el('b', '', p.a), ` (c/u S/ ${money(p.monto / per)})`);
    pays.appendChild(li);
  });

  const fix = $('qFix');
  fix.innerHTML = '';
  const res = q.results || [];
  Q_FIXTURES.forEach(([a, b], i) => {
    const li = el('li');
    const r = res[i];
    if (r) {
      li.append(`✅ P${i + 1}: `, el('b', '', q.roster[r.w].name), ' venció a ', el('b', '', q.roster[r.l].name));
    } else if (i === q.idx) {
      li.append(`▶️ P${i + 1}: `, el('b', '', `${q.roster[a].name} vs ${q.roster[b].name}`), ' (en juego)');
    } else {
      li.append(`⏳ P${i + 1}: ${q.roster[a].name} vs ${q.roster[b].name}`);
    }
    fix.appendChild(li);
  });
}

$('q1').addEventListener('click', () => { if (q && q.idx < Q_FIXTURES.length) victoriaCuatro(Q_FIXTURES[q.idx][0]); });
$('q2').addEventListener('click', () => { if (q && q.idx < Q_FIXTURES.length) victoriaCuatro(Q_FIXTURES[q.idx][1]); });

function victoriaCuatro(winner) {
  if (!esAdmin || !q || q.idx >= Q_FIXTURES.length) return;
  const idx = q.idx;
  const [a, b] = Q_FIXTURES[idx];
  const loser = winner === a ? b : a;
  const nombre = q.roster[winner].name;

  // La transacción evita dobles toques o que dos admins registren el mismo partido
  cuatroRef.transaction((cur) => {
    if (!cur || !cur.started || cur.idx !== idx) return;
    const { historial, ...previo } = cur;
    const nuevo = JSON.parse(JSON.stringify(previo));
    const W = nuevo.roster[winner], L = nuevo.roster[loser];
    W.cash += nuevo.bet; L.cash -= nuevo.bet;
    W.pj += 1; L.pj += 1; W.pg += 1; L.pp += 1;
    nuevo.results = [...(previo.results || []), { w: winner, l: loser }];
    nuevo.idx = idx + 1;
    nuevo.historial = [...(historial || []), previo].slice(-10);
    return nuevo;
  }, (error, committed) => {
    if (error) { toast('⚠️ No se pudo guardar. Revisa tu conexión.'); return; }
    if (!committed) { toast('Ese partido ya estaba registrado.'); return; }
    playRoarSound('win');
    toast(`🏆 ${nombre} se lleva el partido`);
  });
}

function deshacerCuatro() {
  if (!esAdmin) return;
  if (!confirm('¿Deshacer el último partido registrado?')) return;
  cuatroRef.transaction((cur) => {
    if (!cur || !cur.historial || !cur.historial.length) return;
    const hist = cur.historial.slice();
    const previo = hist.pop();
    previo.historial = hist;
    previo.started = true;
    return previo;
  }, (error, committed) => {
    if (committed) { playRoarSound('lose'); toast('↩️ Último partido deshecho'); }
  });
}

function resetCuatro() {
  if (!esAdmin) return;
  if (confirm('¿Reiniciar los 4 equipos? Se borran las cuentas y el historial.')) cuatroRef.remove();
}

function compartirCuatroWhatsApp() {
  if (!esAdmin || !q) return;
  const per = q.per || 6;
  const fin = q.idx >= Q_FIXTURES.length;
  const medallas = ['🥇', '🥈', '🥉', '4️⃣'];
  const filas = qOrdenados()
    .map((t, i) => `${medallas[i]} *${t.name}* · ${t.pg}G/${t.pp}P ➔ *${estadoEquipo(t)}* (c/u ${qSigno(t.cash)}S/ ${money(t.cash / per)})`)
    .join('\n');
  const pagos = qPagos();
  const textoPagos = pagos.length
    ? pagos.map((p) => `• ${p.de} ➔ ${p.a}: S/ ${money(p.monto)} (c/u S/ ${money(p.monto / per)})`).join('\n')
    : 'Sin cuentas pendientes.';
  const estado = fin
    ? '✅ Todos los partidos jugados'
    : `▶️ Ahora: *${q.roster[Q_FIXTURES[q.idx][0]].name}* vs *${q.roster[Q_FIXTURES[q.idx][1]].name}* (partido ${q.idx + 1}/${Q_FIXTURES.length})`;

  abrirWhatsApp(
`❄️🔥 *ICEFIRE · 4 EQUIPOS* 🔥❄️
🏐 Todos contra todos
💰 Bolsa por partido: S/ ${q.bet.toFixed(2)} · ${per} jugadores por equipo

${filas}

💸 *Quién le paga a quién:*
${textoPagos}

${estado}

👉 ${LINK_APP}`);
}

/* ==========================================================================
   5. Modo 2: Individual / refuerzos en vivo
   ========================================================================== */
let soldiers = {};
let fee = 3, lateFee = window.ICEFIRE.multaTardanza;
const NUM_GRUPOS = 6; // cantidad de grupos disponibles para elegir

// Los montos se guardan en Firebase para que todos vean la misma liquidación
configRef.on('value', (snapshot) => {
  const c = snapshot.val() || {};
  fee = num(c.fee, 3);
  lateFee = num(c.lateFee, window.ICEFIRE.multaTardanza);
  if (document.activeElement !== $('pFee')) $('pFee').value = fee;
  if (document.activeElement !== $('pLateFee')) $('pLateFee').value = lateFee;
  $('pFeeInfo').textContent = `Set perdido: S/ ${fee.toFixed(2)} · Tardanza: S/ ${lateFee.toFixed(2)}`;
  refreshRoster();
});

function guardarConfig() {
  if (!esAdmin) return;
  configRef.set({ fee: num($('pFee').value, 3), lateFee: num($('pLateFee').value, window.ICEFIRE.multaTardanza) });
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
    meta.appendChild(el('b', '', `${numeroDe(id)}. 🐉 ${s.tag}`));
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
`⚔️🏐 *ICEFIRE · LIQUIDACIÓN INDIVIDUAL* 🔥
💰 Set perdido: S/ ${fee.toFixed(2)}
⏰ Tardanza (${window.ICEFIRE.tardanzaGeneral()}): S/ ${lateFee.toFixed(2)}

${reporte}

Quien debe, yapea al ganador o a un admin. 🐉
👉 ${LINK_APP}`);
}

aplicarModoAdmin();
