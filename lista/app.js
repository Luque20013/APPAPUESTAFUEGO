// ==========================================================================
// FIREBASE
// ==========================================================================
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
const jugadoresRef = db.ref('jugadores');

const MAX = 18;
const HORA_CIERRE = 14;   // 2:00 PM: se libera a los que no pagaron
const HORA_FIN = 22;      // 10:00 PM: termina el juego y se limpia la lista
const COLORES = {
  Armador: '#38bdf8', Punta: '#fb923c', Opuesto: '#f472b6', Central: '#a78bfa', Defensa: '#34d399'
};

let totalJugadores = 0;
let depuracionEjecutadaHoy = false;
let primeraCarga = true;

const $ = (id) => document.getElementById(id);

let pendientesCount = 0;
function pasoLas2PM() {
  const a = new Date();
  const d = a.getDay();
  return (d === 2 || d === 5) && a.getHours() >= HORA_CIERRE && a.getHours() < HORA_FIN;
}
// La lista solo está "llena" si no hay pendientes liberables después de las 2:00 PM
function llena() {
  return totalJugadores >= MAX && !(pasoLas2PM() && pendientesCount > 0);
}

// ==========================================================================
// 1. SONIDO Y EFECTOS
// ==========================================================================
const AC = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function reproducirSonidoExito() {
  try {
    if (!audioCtx) audioCtx = new AC();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.22);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(t + 0.22);
  } catch (e) {}
}

function lanzarConfeti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const emojis = ['🏐', '🔥', '🏐', '⚡'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('span');
    el.className = 'fx';
    el.textContent = emojis[i % emojis.length];
    el.style.left = (35 + Math.random() * 30) + '%';
    el.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
    el.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg');
    el.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
}

// ==========================================================================
// 2. MÚSICA
// ==========================================================================
let musicaSonando = false;
function toggleMusica() {
  const audio = $('bg-audio');
  const status = $('music-status');
  if (!audio) return;
  if (musicaSonando) {
    audio.pause();
    musicaSonando = false;
    status.innerText = 'OFF';
  } else {
    audio.volume = 0.4;
    audio.play().then(() => {
      musicaSonando = true;
      status.innerText = 'ON 🔥';
    }).catch(() => alert('Haz un clic en la página primero para permitir el audio.'));
  }
}

// ==========================================================================
// 3. LIMPIEZA AUTOMÁTICA DESPUÉS DEL JUEGO (martes y viernes, 10:00 PM)
// ==========================================================================
function finDelUltimoJuego() {
  // Busca hacia atrás el último martes/viernes cuyo juego ya terminó (22:00)
  const ahora = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(ahora);
    d.setDate(ahora.getDate() - i);
    d.setHours(HORA_FIN, 0, 0, 0);
    if ((d.getDay() === 2 || d.getDay() === 5) && d <= ahora) return d.getTime();
  }
  return 0;
}

function limpiarListaSiCorresponde() {
  const finJuego = finDelUltimoJuego();
  if (!finJuego) return;
  // La transacción garantiza que la limpieza ocurra una sola vez por partido,
  // aunque varias personas tengan la página abierta.
  db.ref('ultimaLimpieza').transaction((actual) => {
    if (actual && actual >= finJuego) return; // ya se limpió, cancela
    return Date.now();
  }, (error, committed) => {
    if (!error && committed) jugadoresRef.remove();
  });
}

// ==========================================================================
// 4. HORARIO OFICIAL
// Martes: abre Domingo 00:00 hasta Martes 2:00 PM
// Viernes: abre Miércoles 00:00 hasta Viernes 2:00 PM
// ==========================================================================
function controlarHorario() {
  const timerEl = $('countdown-timer');
  const labelEl = $('countdown-label');
  const btnSubmit = $('btn-submit');
  const inputName = $('player-name');

  const tick = () => {
    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours();

    limpiarListaSiCorresponde();

    let proximoJuego = null;
    let diaNombre = '';

    if (dia === 0 || dia === 1 || (dia === 2 && hora < HORA_CIERRE)) {
      diaNombre = 'MARTES';
      proximoJuego = new Date(ahora);
      proximoJuego.setDate(ahora.getDate() + ((2 - dia + 7) % 7));
      proximoJuego.setHours(HORA_CIERRE, 0, 0, 0);
    } else if (dia === 3 || dia === 4 || (dia === 5 && hora < HORA_CIERRE)) {
      diaNombre = 'VIERNES';
      proximoJuego = new Date(ahora);
      proximoJuego.setDate(ahora.getDate() + (5 - dia));
      proximoJuego.setHours(HORA_CIERRE, 0, 0, 0);
    }

    timerEl.classList.remove('small');

    if (proximoJuego) {
      depuracionEjecutadaHoy = false;
      const diff = proximoJuego - ahora;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      const pad = (n) => String(n).padStart(2, '0');

      labelEl.innerText = `⏳ Cierre regular: ${diaNombre} 2:00 PM`;
      timerEl.innerText = (d > 0 ? `${d}d ` : '') + `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
      timerEl.style.color = '#ffffff';

      if (!llena()) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = '⚡ Asegurar mi cupo';
        inputName.disabled = false;
      }
      return;
    }

    const esDiaPartido = (dia === 2 || dia === 5) && hora < HORA_FIN;

    if (esDiaPartido) {
      labelEl.innerText = '🚨 2:00 PM cumplida · ¡Yape manda!';
      timerEl.classList.add('small');
      timerEl.innerText = 'Los pendientes siguen anotados, pero su cupo se libera si alguien yapea.';
      timerEl.style.color = '#fbbf24';

      if (!llena()) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = '⚡ Entrar por Yape manda';
        inputName.disabled = false;
      } else {
        btnSubmit.disabled = true;
        btnSubmit.innerText = '⛔ Cupos completos (18/18)';
        inputName.disabled = true;
      }
    } else {
      const proxima = (dia === 2 || dia === 1) ? 'Abre el Miércoles a las 00:00' : 'Abre el Domingo a las 00:00';
      labelEl.innerText = '📅 Convocatoria en espera';
      timerEl.classList.add('small');
      timerEl.innerText = (dia === 2) ? 'Abre el Miércoles a las 00:00' : proxima;
      timerEl.style.color = '#ef4444';
      btnSubmit.disabled = true;
      btnSubmit.innerText = '⛔ Convocatoria cerrada';
      inputName.disabled = true;
    }
  };

  tick();
  setInterval(tick, 1000);
}

// ==========================================================================
// 5. SACAR A LOS PENDIENTES (2:00 PM)
// ==========================================================================
function depurarSinPagoAutomatico() {
  jugadoresRef.once('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    Object.keys(data).forEach((key) => {
      if (!data[key].pagado) jugadoresRef.child(key).remove();
    });
  });
}

controlarHorario();

// ==========================================================================
// 6. LISTA EN TIEMPO REAL
// ==========================================================================
function dibujarCupos(jugadores) {
  const cont = $('slots');
  const previos = cont.children.length ? cont.querySelectorAll('.slot.on').length : 0;
  cont.innerHTML = '';
  for (let i = 0; i < MAX; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    const j = jugadores[i];
    if (j) {
      s.classList.add('on');
      s.style.setProperty('--c', COLORES[j.posicion] || '#ffa41b');
      s.textContent = i + 1;
      if (!primeraCarga && i >= previos) s.classList.add('pop');
    }
    cont.appendChild(s);
  }
}

let ultimaLista = [];

function renderLista() {
  const container = $('players-container');
  container.innerHTML = '';
  const lista = ultimaLista;

  if (!lista.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Nadie anotado todavía. ¡Sé el primero en asegurar tu cupo!';
    container.appendChild(p);
  }

  lista.forEach((j, i) => {
    const row = document.createElement('div');
    row.className = 'row' + (!j.pagado && pasoLas2PM() ? ' risk' : '');
    row.style.setProperty('--c', COLORES[j.posicion] || '#ff4d12');

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(i + 1).padStart(2, '0');

    const who = document.createElement('div');
    who.className = 'who';
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = j.nombre;
    const ps = document.createElement('span');
    ps.className = 'ps';
    ps.textContent = j.posicion;
    who.append(nm, ps);

    const acts = document.createElement('div');
    acts.className = 'acts';
    const chk = document.createElement(esAdmin ? 'button' : 'span');
    chk.className = 'chk ' + (j.pagado ? 'ok' : 'pend');
    chk.textContent = j.pagado ? '✅ Pagado' : (pasoLas2PM() ? '⚠️ Sin pagar' : '⏳ Pendiente');
    acts.appendChild(chk);
    if (esAdmin) {
      chk.onclick = () => validarCheckAdmin(j.key, !!j.pagado);
      const x = document.createElement('button');
      x.className = 'x';
      x.setAttribute('aria-label', 'Borrar jugador');
      x.textContent = '✕';
      x.onclick = () => borrarJugadorAdmin(j.key);
      acts.appendChild(x);
    }

    row.append(num, who, acts);
    container.appendChild(row);
  });
}

jugadoresRef.on('value', (snapshot) => {
  const data = snapshot.val();
  ultimaLista = data
    ? Object.keys(data).map((k) => ({ key: k, ...data[k] })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    : [];

  totalJugadores = ultimaLista.length;
  pendientesCount = ultimaLista.filter((j) => !j.pagado).length;
  actualizarBarra(totalJugadores);
  dibujarCupos(ultimaLista);
  renderLista();

  if (llena()) {
    $('btn-submit').disabled = true;
    $('btn-submit').innerText = '⛔ Cupos completos (18/18)';
    $('player-name').disabled = true;
  }
  primeraCarga = false;
});

function actualizarBarra(cantidad) {
  $('cupos-count').innerText = `${cantidad} / ${MAX}`;
  $('cupos-bar').style.width = `${Math.min((cantidad / MAX) * 100, 100)}%`;
}

// ==========================================================================
// 7. REGISTRAR JUGADOR
// ==========================================================================
function registrarJugador(e) {
  e.preventDefault();
  if (llena()) {
    alert('La lista ya tiene 18 cupos.');
    return;
  }
  if (totalJugadores >= MAX) {
    // Yape manda: se libera el último pendiente para dar el cupo
    const liberable = [...ultimaLista].reverse().find((j) => !j.pagado);
    if (liberable) jugadoresRef.child(liberable.key).remove();
  }
  const nombre = $('player-name').value.trim();
  const posicion = $('player-pos').value;
  if (!nombre || !posicion) return;

  jugadoresRef.push({
    nombre: nombre,
    posicion: posicion,
    pagado: false,
    timestamp: Date.now()
  }).then(() => {
    reproducirSonidoExito();
    lanzarConfeti();
    $('player-name').value = '';
    $('player-pos').value = '';
  });
}

// ==========================================================================
// 8. ADMIN (PINES)
// ==========================================================================
let esAdmin = false;
try { esAdmin = sessionStorage.getItem('fuegoAdmin') === '1'; } catch (e) {}

function esPinValido(pin) {
  return pin === '1111' || pin === '2222' || pin === '3333' || pin === '4444';
}

function aplicarModoAdmin() {
  $('admin-panel').hidden = !esAdmin;
  $('btn-admin').textContent = esAdmin ? '🔒 Salir admin' : '👑 Admin';
  $('btn-admin').classList.toggle('on', esAdmin);
  renderLista();
}

function toggleAdmin() {
  if (esAdmin) {
    esAdmin = false;
  } else {
    const pin = prompt('PIN de Admin:');
    if (pin === null) return;
    if (!esPinValido(pin)) { alert('⛔ PIN incorrecto.'); return; }
    esAdmin = true;
    reproducirSonidoExito();
  }
  try { sessionStorage.setItem('fuegoAdmin', esAdmin ? '1' : '0'); } catch (e) {}
  aplicarModoAdmin();
  if (esAdmin) $('admin-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function validarCheckAdmin(id, estadoActual) {
  if (!esAdmin) return;
  reproducirSonidoExito();
  jugadoresRef.child(id).update({ pagado: !estadoActual });
}

function borrarJugadorAdmin(id) {
  if (!esAdmin) return;
  jugadoresRef.child(id).remove();
}

function depurarSinPagoAdmin() {
  if (!esAdmin) return;
  if (confirm('¿Sacar de la lista a todos los que no han yapeado?')) depurarSinPagoAutomatico();
}

function limpiarListaAdmin() {
  if (!esAdmin) return;
  if (confirm('¿Seguro? Se borrarán todos los jugadores.')) jugadoresRef.remove();
}

// ==========================================================================
// MENSAJES DE WHATSAPP
// ==========================================================================
const LINK_LISTA = 'https://luque20013.github.io/APPAPUESTAFUEGO/lista/';
const LINK_MAPA = 'https://maps.app.goo.gl/j4iLVUUAToinSwPp7?g_st=iw';

function proximoPartido() {
  const ahora = new Date();
  const dia = ahora.getDay();
  const hora = ahora.getHours();
  const esViernes = (dia === 2 && hora >= HORA_FIN) || dia === 3 || dia === 4 || (dia === 5 && hora < HORA_FIN);
  const objetivo = esViernes ? 5 : 2;
  const fecha = new Date(ahora);
  fecha.setDate(ahora.getDate() + ((objetivo - dia + 7) % 7));
  const texto = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return { nombre: esViernes ? 'VIERNES' : 'MARTES', fecha: texto };
}

function abrirWhatsApp(mensaje) {
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function pedirPin() {
  if (!esAdmin) alert('👑 Entra al modo admin para usar esta función.');
  return esAdmin;
}

// 1) CONVOCATORIA
function compartirWhatsAppAdmin() {
  if (!pedirPin('PIN de Admin para enviar la convocatoria:')) return;
  const p = proximoPartido();
  abrirWhatsApp(
`🔥🏐 *TEAM FUEGO · CONVOCATORIA ${p.nombre}* 🏐🔥

Ya está abierta la lista, gente. ¡A asegurar cupo!

📅 *${p.fecha}*
🕗 *8:00 a 10:00 PM* (calentamos 7:55)
📍 *Cancha Berlín*
🗺️ ${LINK_MAPA}

💰 *Cuota:* S/ 3.40 por Yape
⚡ *Solo 18 cupos.* Con check verde a las 2:00 PM, tu lugar es fijo. Sin check, sales y *Yape manda*.
⏱️ Pasadas las 8:15 PM, S/ 2.00 de tardanza.

👉 *Anótate aquí:* ${LINK_LISTA}
Pon tu nombre o apodo y tu posición fija.

¡Buena vibra y a darle con todo! 🦁`);
}

// 2) LISTA ACTUAL (titulares, pagos y cupos libres)
function compartirListaWhatsApp() {
  if (!pedirPin()) return;
  jugadoresRef.once('value', (snapshot) => {
    const data = snapshot.val();
    const lista = data
      ? Object.keys(data).map((k) => data[k]).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      : [];
    const p = proximoPartido();
    const pagados = lista.filter((j) => j.pagado).length;
    const libres = MAX - lista.length;

    const lineas = lista.length
      ? lista.map((j, i) => `${String(i + 1).padStart(2, '0')}. ${j.pagado ? '✅' : '⏳'} ${j.nombre} · ${j.posicion}`).join('\n')
      : 'Aún no hay nadie anotado. ¡Sé el primero!';

    abrirWhatsApp(
`🏐🔥 *TEAM FUEGO · LISTA ${p.nombre}* 🔥🏐
📅 ${p.fecha} · 8:00 PM · Cancha Berlín

${lineas}

📊 *${lista.length}/${MAX} anotados* · ✅ ${pagados} pagados · ⏳ ${lista.length - pagados} pendientes
${libres > 0 ? `🟢 *Quedan ${libres} cupos libres*` : '🔴 *Lista completa*'}

✅ = pagado, cupo fijo
⏳ = pendiente, sale a las 2:00 PM si no yapea

👉 Anótate o revisa en vivo: ${LINK_LISTA}`);
  });
}

// 3) COBRO A PENDIENTES
function notificarPendientesWhatsAppAdmin() {
  if (!pedirPin('PIN de Admin para cobrar a pendientes:')) return;

  jugadoresRef.once('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      alert('No hay jugadores registrados en la lista.');
      return;
    }

    const pendientes = Object.keys(data)
      .map((k) => data[k])
      .filter((j) => !j.pagado)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .map((j, i) => `${i + 1}. ${j.nombre} · ${j.posicion}`);

    if (!pendientes.length) {
      alert('🎉 ¡Todos los inscritos ya tienen su check de pagado!');
      return;
    }

    const p = proximoPartido();
    abrirWhatsApp(
`⏳ *TEAM FUEGO · FALTA YAPEAR* ⏳
Partido del *${p.fecha}*

Estas personas aún no tienen check verde:

${pendientes.join('\n')}

💰 *Cuota:* S/ 3.40
🚨 *Límite:* 2:00 PM de hoy. Después, se libera tu cupo y *Yape manda*.

📲 *Yape Angelo:* 946 639 126
📲 *Yape Yulisa:* 996 723 629
Manda tu captura por privado y te ponemos el ✅

👉 Lista en vivo: ${LINK_LISTA}`);
  });
}

aplicarModoAdmin();
