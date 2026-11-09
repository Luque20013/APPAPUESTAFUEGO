// ============================================================================
//  ICEFIRE · CONFIGURACIÓN DEL GRUPO
//  Edita SOLO este archivo para cambiar días, horas, cuota, cupos, Yape, PINs...
//  Las líneas marcadas con ✏️ son las que debes revisar antes de usar la app.
// ============================================================================
window.ICEFIRE = {
  nombre: 'IceFire',
  lema: 'Vóley mixto',

  // ✏️ Cancha (si aún no tienes el link del mapa, déjalo vacío: '')
  cancha: { nombre: 'Cancha por confirmar', mapa: '' },

  // ✏️ Cupos y cuota (en soles) por jugador
  cupos: 18,
  cuota: 3.40,

  // Hora límite de pago el día del juego (24 h). 14 = 2:00 PM. Si no pagan, se libera el cupo.
  cierreHora: 14,
  calentamientoMin: 5,   // se calienta 5 min antes del inicio
  tardanzaMin: 15,       // pasados estos minutos del inicio se cobra tardanza
  multaTardanza: 2,      // S/ por tardanza

  // ✏️ Días de pichanga. 0 = domingo, 1 = lunes ... 6 = sábado.
  // ini / fin en hora de 24 h (20 = 8:00 PM, 22 = 10:00 PM).
  // Opcional por día: cierre: 12  (si ese día el cierre de pagos es distinto)
  dias: {
    1: { n: 'LUNES',   ini: 20, fin: 22 },
    4: { n: 'JUEVES',  ini: 20, fin: 22 },
    6: { n: 'SÁBADO',  ini: 20, fin: 22 },
    0: { n: 'DOMINGO', ini: 20, fin: 22 }
  },

  // ✏️ Quién recibe los Yapes. Sube el QR a la carpeta lista/ y pon su nombre de archivo en "qr".
  // Si "numero" está vacío, esa persona no aparece.
  pais: '51',
  yape: [
    { nombre: 'Yulisa', numero: '996 723 629', qr: 'imagen2.png' }
  ],

  // ✏️ PIN de cada admin → nombre. CÁMBIALOS. Ojo: quien abra el código del repo puede verlos.
  admins: {
    '200826': 'Yulisa'
  },

  // Posiciones fijas y su color en el mapa de cupos
  posiciones: { Armador: '#38bdf8', Punta: '#fb923c', Central: '#a78bfa', Opuesto: '#f472b6' },

  // Firebase: el MISMO proyecto y base de datos de siempre (no hay que crear ni activar nada nuevo).
  firebase: {
    apiKey: 'AIzaSyC5FKtlCWyec1AxAfwegrxcJyTlR7fLMiE',
    authDomain: 'team-fuego-voley.firebaseapp.com',
    databaseURL: 'https://team-fuego-voley-default-rtdb.firebaseio.com',
    projectId: 'team-fuego-voley',
    storageBucket: 'team-fuego-voley.firebasestorage.app',
    messagingSenderId: '327602190796',
    appId: '1:327602190796:web:651f3cc662eaa4942f0569',
    measurementId: 'G-NST7Q054NZ'
  }
};

// ---------------------------------------------------------------------------
//  Ayudas de horario (no necesitas tocar nada de aquí hacia abajo)
// ---------------------------------------------------------------------------
(function () {
  const C = window.ICEFIRE;
  const pad = (n) => String(n).padStart(2, '0');
  const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();

  C.h12 = (h, m) => { h = ((h % 24) + 24) % 24; return `${h % 12 === 0 ? 12 : h % 12}:${pad(m || 0)} ${h >= 12 ? 'PM' : 'AM'}`; };
  C.hm = (min) => C.h12(Math.floor(min / 60), min % 60);
  C.cierreHoraDe = (cfg) => (cfg.cierre != null ? cfg.cierre : C.cierreHora);
  C.cierreDe = (f) => { const x = new Date(f); x.setHours(C.cierreHoraDe(C.dias[f.getDay()]), 0, 0, 0); return x; };
  C.finDe = (f) => { const x = new Date(f); x.setHours(C.dias[f.getDay()].fin, 0, 0, 0); return x; };

  // Próximo partido que todavía no termina (puede ser hoy)
  C.proximoPartido = (ahora) => {
    ahora = ahora || new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(ahora); d.setDate(ahora.getDate() + i);
      const cfg = C.dias[d.getDay()];
      if (cfg && C.finDe(d) > ahora) return { fecha: d, cfg, nombre: cfg.n };
    }
    return null;
  };
  // Fin del último partido que ya terminó
  C.ultimoFin = (ahora) => {
    ahora = ahora || new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(ahora); d.setDate(ahora.getDate() - i);
      if (!C.dias[d.getDay()]) continue;
      const f = C.finDe(d);
      if (f <= ahora) return f;
    }
    return null;
  };

  const ORDEN = [1, 2, 3, 4, 5, 6, 0];
  const diasOrdenados = () => ORDEN.filter((d) => C.dias[d]);
  C.rango = (cfg) => {
    const a = C.h12(cfg.ini), b = C.h12(cfg.fin);
    return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} a ${b}` : `${a} a ${b}`;
  };
  C.mismaIni = () => { const s = new Set(diasOrdenados().map((d) => C.dias[d].ini)); return s.size === 1 ? [...s][0] : null; };
  C.calentamiento = (cfg) => C.hm(cfg.ini * 60 - C.calentamientoMin);
  C.tardanzaDe = (cfg) => C.hm(cfg.ini * 60 + C.tardanzaMin);
  C.tardanzaGeneral = () => { const i = C.mismaIni(); return i != null ? `después de ${C.hm(i * 60 + C.tardanzaMin)}` : `pasados ${C.tardanzaMin} min del inicio`; };
  C.tardanzaFrase = () => {
    const i = C.mismaIni();
    return (i != null ? `Pasadas las ${C.hm(i * 60 + C.tardanzaMin)}` : `Pasados ${C.tardanzaMin} min del inicio`) + `, multa de S/ ${C.multaTardanza.toFixed(2)}`;
  };
  C.cierreTexto = () => C.h12(C.cierreHora);
  C.horarioTexto = () => {
    const grupos = {};
    diasOrdenados().forEach((d) => { const r = C.rango(C.dias[d]); (grupos[r] = grupos[r] || []).push(cap(C.dias[d].n)); });
    const unir = (a) => (a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0]);
    return Object.keys(grupos).map((r) => `${unir(grupos[r])} · ${r}`).join('  |  ');
  };
  C.yapeLineas = () => {
    const l = C.yape.filter((y) => y.numero).map((y) => `📲 *Yape ${y.nombre}:* ${y.numero}`);
    return l.length ? l.join('\n') : '📲 Pídele el Yape a un admin por privado';
  };

  // Rellena los textos de las páginas con esta configuración
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    if ($('cfg-horario')) $('cfg-horario').textContent = `${C.lema} · ${C.horarioTexto()}`;
    if ($('cfg-horario-main')) $('cfg-horario-main').textContent = C.horarioTexto();
    if ($('cfg-tardanza-main')) $('cfg-tardanza-main').textContent = `⚠️ ${C.tardanzaFrase()}`;
    if ($('pLateFee')) $('pLateFee').value = C.multaTardanza;
    ['cfg-cancha', 'cfg-cancha-main'].forEach((id) => {
      const a = $(id); if (!a) return;
      const main = id === 'cfg-cancha-main';
      const mapa = !!C.cancha.mapa;
      a.innerHTML = main ? `📍 ${C.cancha.nombre.toUpperCase()}${mapa ? ' · MAPA 🗺️' : ''}` : `📍 ${C.cancha.nombre}${mapa ? ' <b>Ver mapa</b>' : ''}`;
      if (mapa) { a.href = C.cancha.mapa; a.target = '_blank'; a.rel = 'noopener noreferrer'; } else a.removeAttribute('href');
    });
    if ($('cfg-reglas')) {
      const i = C.mismaIni();
      const cal = i != null ? `Calentamiento ${C.hm(i * 60 - C.calentamientoMin)}` : `Calentamiento ${C.calentamientoMin} min antes del inicio`;
      $('cfg-reglas').innerHTML = [`⏰ ${cal}`, `🚨 ${C.tardanzaFrase()}`, `⚡ Sin check verde a las ${C.cierreTexto()}, sales y Yape manda`, '🎯 Posiciones fijas', '🤝 Acá se alienta, no se resta']
        .map((x) => `<li>${x}</li>`).join('');
    }
    if ($('cfg-pago-titulo')) $('cfg-pago-titulo').textContent = `Pago previo · S/ ${C.cuota.toFixed(2)}`;
    if ($('cfg-pago-aviso')) $('cfg-pago-aviso').textContent = `Hasta las ${C.cierreTexto()} del día del juego. Sin check verde, sales de la lista y Yape manda.`;
    if ($('cfg-yape')) {
      const g = $('cfg-yape');
      const lista = C.yape.filter((y) => y.numero);
      if (!lista.length) g.innerHTML = '<p class="pay-sub">Pídele a un admin los datos de Yape por privado.</p>';
      lista.forEach((y) => {
        const num = y.numero.replace(/\D/g, '');
        const msg = encodeURIComponent(`Hola ${y.nombre}, aquí te mando mi voucher para la pichanga de ${C.nombre} 🏐🔥`);
        const d = document.createElement('div');
        d.className = 'qr';
        d.innerHTML = `<p>Yape ${y.nombre}</p>` + (y.qr ? `<img src="${y.qr}" alt="QR de Yape de ${y.nombre}">` : '') +
          `<a class="btn-wa" href="https://wa.me/${C.pais}${num}?text=${msg}" target="_blank" rel="noopener noreferrer">📲 ${y.numero}</a>`;
        g.appendChild(d);
      });
    }
  });
})();
