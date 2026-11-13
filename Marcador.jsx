import React, { useState, useEffect } from 'react';

const KEYS = ['A', 'B', 'C', 'D'];
const money = (n) => `S/ ${Number(n).toFixed(2)}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const card = 'rounded-2xl border border-slate-700 bg-slate-900/70 p-3 space-y-2';
const inp = 'w-full rounded-xl bg-slate-800 border border-slate-600 px-3 py-2 text-sm';
const btn = 'px-3 py-2 rounded-xl text-xs font-bold border border-slate-600 text-slate-200 active:scale-95';
const btnOn = 'px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black active:scale-95';

// Pagos mínimos: los que deben le pagan a los que ganan
function pagos(items) {
  const deb = [], cre = [];
  items.forEach((t) => { const c = Math.round(t.c * 100); if (c < 0) deb.push({ n: t.name, c: -c }); else if (c > 0) cre.push({ n: t.name, c }); });
  deb.sort((a, b) => b.c - a.c); cre.sort((a, b) => b.c - a.c);
  const out = []; let i = 0, j = 0;
  while (i < deb.length && j < cre.length) {
    const m = Math.min(deb[i].c, cre[j].c);
    out.push({ de: deb[i].n, a: cre[j].n, monto: m / 100 });
    deb[i].c -= m; cre[j].c -= m;
    if (!deb[i].c) i++; if (!cre[j].c) j++;
  }
  return out;
}
const Pagos = ({ list, title }) => (
  <div className={card}>
    <b className="text-sm">💸 {title}</b>
    {list.length ? list.map((p, i) => <p key={i} className="text-sm"><b>{p.de}</b> → <b>{p.a}</b>: {money(p.monto)}</p>) : <p className="text-xs text-slate-400">Nadie debe nada.</p>}
  </div>
);
const wa = (text) => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');

function useDoc(db, id) {
  const [d, setD] = useState(undefined);
  const ref = db.collection('marcador').doc(id);
  useEffect(() => ref.onSnapshot((s) => setD(s.exists ? s.data() : null), () => setD(null)), [id]);
  return [d, (data) => ref.set(data), () => ref.delete()];
}

// ===== 4 EQUIPOS: ronda 1 = A-B y C-D; luego ganadores vs ganadores y perdedores vs perdedores =====
function fixture(res, i) {
  const r = Math.floor(i / 2), k = i % 2;
  if (r === 0) return k ? ['C', 'D'] : ['A', 'B'];
  const a = res['m' + (2 * r - 2)], b = res['m' + (2 * r - 1)];
  if (!a || !b) return null;
  return k ? [a.l, b.l] : [a.w, b.w];
}

function Cuatro({ db }) {
  const [d, save, del] = useDoc(db, 'cuatro');
  const [f, setF] = useState({ bet: 20, n: ['Equipo A', 'Equipo B', 'Equipo C', 'Equipo D'] });
  if (d === undefined) return <p className="text-sm text-slate-400">Cargando…</p>;
  if (!d || !d.started) {
    return (
      <div className={card}>
        <b className="text-sm">Nueva jornada de 4 equipos</b>
        <label className="text-xs text-slate-400">Apuesta por partido (S/)<input className={inp} type="number" value={f.bet} onChange={(e) => setF({ ...f, bet: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-2">{f.n.map((x, i) => <input key={i} className={inp} value={x} onChange={(e) => { const n = [...f.n]; n[i] = e.target.value; setF({ ...f, n }); }} />)}</div>
        <button className={btnOn + ' w-full'} onClick={() => { const roster = {}; KEYS.forEach((k, i) => { roster[k] = { name: f.n[i].trim() || 'Equipo ' + k, pg: 0, pp: 0, cash: 0 }; }); save({ started: true, bet: Number(f.bet) || 0, roster, results: {} }); }}>▶️ Empezar</button>
      </div>
    );
  }
  const res = d.results || {};
  const n = Object.keys(res).length;
  const ronda = Math.floor(n / 2);
  const rec = (i, w) => {
    const [a, b] = fixture(res, i); const l = w === a ? b : a;
    const r = clone(d);
    r.roster[w].cash += d.bet; r.roster[l].cash -= d.bet; r.roster[w].pg++; r.roster[l].pp++;
    r.results = { ...res, ['m' + i]: { w, l } };
    save(r);
  };
  const undo = () => {
    const ks = Object.keys(res).sort((x, y) => x.slice(1) - y.slice(1));
    if (!ks.length) return;
    const k = ks.pop(); const { w, l } = res[k]; const r = clone(d);
    r.roster[w].cash -= d.bet; r.roster[l].cash += d.bet; r.roster[w].pg--; r.roster[l].pp--; delete r.results[k];
    save(r);
  };
  const tabla = KEYS.map((k) => ({ k, ...d.roster[k] })).sort((x, y) => y.pg - x.pg || y.cash - x.cash);
  const pg = pagos(tabla.map((t) => ({ name: t.name, c: t.cash })));
  const txt = `🏐 *IceFire · 4 equipos*\n` + tabla.map((t) => `${t.name}: ${t.pg}G-${t.pp}P (${t.cash >= 0 ? '+' : ''}${money(t.cash)})`).join('\n') + '\n\n💸 ' + (pg.length ? pg.map((p) => `${p.de} → ${p.a}: ${money(p.monto)}`).join('\n') : 'Sin deudas');
  return (
    <div className="space-y-3">
      {!d.finished && (
        <div className={card}>
          <b className="text-sm">Ronda {ronda + 1} · apuesta {money(d.bet)}</b>
          {[2 * ronda, 2 * ronda + 1].map((i) => {
            const fx = fixture(res, i); if (!fx || res['m' + i]) return <p key={i} className="text-xs text-slate-400">Cancha {(i % 2) + 1}: ✅ listo</p>;
            return (
              <div key={i} className="space-y-1">
                <p className="text-[11px] text-slate-400">Cancha {(i % 2) + 1} — toca al ganador</p>
                <div className="grid grid-cols-2 gap-2">{fx.map((k) => <button key={k} className={btn} onClick={() => rec(i, k)}>🏆 {d.roster[k].name}</button>)}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className={card}>
        <b className="text-sm">Tabla</b>
        {tabla.map((t, i) => <div key={t.k} className="flex justify-between text-sm"><span>{i + 1}. {t.name}</span><span>{t.pg}G-{t.pp}P · <b className={t.cash >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{t.cash >= 0 ? '+' : ''}{money(t.cash)}</b></span></div>)}
      </div>
      <Pagos list={pg} title="Quién le paga a quién" />
      <div className="flex gap-2 flex-wrap">
        <button className={btn} onClick={undo}>↩️ Deshacer</button>
        <button className={btn} onClick={() => save({ ...d, finished: !d.finished })}>{d.finished ? '▶️ Reanudar' : '🏁 Terminar'}</button>
        <button className={btn} onClick={() => wa(txt)}>📲 WhatsApp</button>
        <button className={btn + ' text-rose-400'} onClick={() => confirm('¿Borrar toda la jornada?') && del()}>🗑️ Reiniciar</button>
      </div>
    </div>
  );
}

// ===== INDIVIDUAL: neto = (ganados - perdidos) × cuota − tardanza =====
function Individual({ db }) {
  const [d, save] = useDoc(db, 'individual');
  const [name, setName] = useState('');
  if (d === undefined) return <p className="text-sm text-slate-400">Cargando…</p>;
  const s = d || { fee: 3, lateFee: 2, players: {} };
  const upd = (p) => save({ fee: s.fee, lateFee: s.lateFee, players: s.players || {}, ...p });
  const setP = (id, ch) => upd({ players: { ...s.players, [id]: { ...s.players[id], ...ch } } });
  const list = Object.entries(s.players || {}).map(([id, p]) => ({ id, ...p, net: (p.w - p.l) * s.fee - (p.late ? s.lateFee : 0) })).sort((a, b) => b.net - a.net);
  const pg = pagos(list.map((p) => ({ name: p.tag, c: p.net })));
  const add = () => { const t = name.trim(); if (!t) return; setP('p' + Date.now(), { tag: t.slice(0, 24), w: 0, l: 0, late: false }); setName(''); };
  const txt = `🏐 *IceFire · Individual*\n` + list.map((p) => `${p.tag}: ${p.w}G-${p.l}P → ${p.net >= 0 ? '+' : ''}${money(p.net)}`).join('\n') + '\n\n💸 ' + (pg.length ? pg.map((p) => `${p.de} → ${p.a}: ${money(p.monto)}`).join('\n') : 'Sin deudas');
  return (
    <div className="space-y-3">
      <div className={card}>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-400">Set perdido (S/)<input className={inp} type="number" value={s.fee} onChange={(e) => upd({ fee: Number(e.target.value) || 0 })} /></label>
          <label className="text-xs text-slate-400">Tardanza (S/)<input className={inp} type="number" value={s.lateFee} onChange={(e) => upd({ lateFee: Number(e.target.value) || 0 })} /></label>
        </div>
        <div className="flex gap-2"><input className={inp} placeholder="Nombre del jugador" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /><button className={btnOn} onClick={add}>＋</button></div>
      </div>
      {list.map((p) => (
        <div key={p.id} className={card}>
          <div className="flex justify-between items-center"><b className="text-sm">{p.tag}</b><b className={p.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{p.net >= 0 ? '+' : ''}{money(p.net)}</b></div>
          <div className="flex gap-1 flex-wrap items-center text-xs">
            <button className={btn} onClick={() => setP(p.id, { w: Math.max(0, p.w - 1) })}>−</button><span>✅ {p.w}</span><button className={btn} onClick={() => setP(p.id, { w: p.w + 1 })}>＋</button>
            <button className={btn} onClick={() => setP(p.id, { l: Math.max(0, p.l - 1) })}>−</button><span>❌ {p.l}</span><button className={btn} onClick={() => setP(p.id, { l: p.l + 1 })}>＋</button>
            <button className={p.late ? btnOn : btn} onClick={() => setP(p.id, { late: !p.late })}>⏱ Tarde</button>
            <button className={btn + ' text-rose-400'} onClick={() => { const pl = { ...s.players }; delete pl[p.id]; upd({ players: pl }); }}>🗑️</button>
          </div>
        </div>
      ))}
      <Pagos list={pg} title="Liquidación" />
      <div className="flex gap-2 flex-wrap">
        <button className={btn} onClick={() => wa(txt)}>📲 WhatsApp</button>
        <button className={btn + ' text-rose-400'} onClick={() => confirm('¿Reiniciar cuentas?') && upd({ players: {} })}>🔄 Reiniciar cuentas</button>
      </div>
    </div>
  );
}

export default function Marcador({ db, isAdmin }) {
  const [v, setV] = useState('cuatro');
  if (!isAdmin) return <p className="text-sm text-slate-400 text-center py-10">🔒 Solo para administradores.</p>;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['cuatro', '🏐 4 Equipos'], ['ind', '⚔️ Individual']].map(([id, l]) => <button key={id} onClick={() => setV(id)} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${v === id ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'border-slate-700 text-slate-400'}`}>{l}</button>)}
      </div>
      {v === 'cuatro' ? <Cuatro db={db} /> : <Individual db={db} />}
      <p className="text-[11px] text-slate-500 text-center">Para 3 equipos usa Equipos → Triangular. Las cartas están en Plantel.</p>
    </div>
  );
}
