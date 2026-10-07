/*
 * Ventana Oscura — renderizado compartido (build en Node + actualización en vivo en el navegador).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const fmtCache = {};
  function fmt(tz, opts) {
    const k = tz + JSON.stringify(opts);
    return fmtCache[k] || (fmtCache[k] = new Intl.DateTimeFormat('es-ES', Object.assign({ timeZone: tz }, opts)));
  }
  function time(ms, tz) { return ms ? fmt(tz, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)) : '—'; }
  function hourOf(ms, tz) { return +fmt(tz, { hour: '2-digit', hour12: false }).format(new Date(ms)) % 24; }
  // Fecha "YYYY-MM-DD" (fecha civil, sin zona)
  function dayFromKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); }
  function longDate(key) { return fmt('UTC', { weekday: 'long', day: 'numeric', month: 'long' }).format(dayFromKey(key)); }
  function longDateY(key) { return fmt('UTC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dayFromKey(key)); }
  function shortDate(key) { return fmt('UTC', { day: 'numeric', month: 'short' }).format(dayFromKey(key)).replace('.', ''); }
  function dateOfMs(ms, tz, withYear) {
    return fmt(tz, Object.assign({ weekday: 'long', day: 'numeric', month: 'long' }, withYear ? { year: 'numeric' } : {})).format(new Date(ms));
  }
  function monthName(m) { return fmt('UTC', { month: 'long' }).format(new Date(Date.UTC(2000, m - 1, 15))); }
  function nextDayKey(key) { const t = dayFromKey(key); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); }
  function dur(min) {
    min = Math.round(min);
    if (min <= 0) return '0 min';
    const h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
  }
  function pct(f) { return Math.round(f * 100) + ' %'; }
  function num(x) { return String(x).replace('.', ','); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function verdict(n) {
    if (!n.astroNight) return { cls: 'v-none', text: 'Sin noche astronómica' };
    if (n.score >= 7) return { cls: 'v-great', text: 'Noche excelente' };
    if (n.score >= 5) return { cls: 'v-good', text: 'Buena noche' };
    if (n.score >= 2.5) return { cls: 'v-fair', text: 'Noche regular' };
    if (n.darkMin > 0) return { cls: 'v-poor', text: 'Poca oscuridad' };
    return { cls: 'v-bad', text: 'Luna brillante toda la noche' };
  }

  function moonIcon(phase, frac, size) {
    // Disco lunar en SVG: iluminado según fase (hemisferio norte; suficiente como pictograma)
    const r = size / 2, waxing = phase < 180;
    const k = Math.cos(phase * Math.PI / 180); // 1 nueva, -1 llena
    const rx = Math.abs(k) * r;
    const sweepOuter = waxing ? 1 : 0;
    const sweepInner = (k > 0) === waxing ? 0 : 1;
    const d = `M${r},0 A${r},${r} 0 0 ${sweepOuter} ${r},${size} A${rx},${r} 0 0 ${sweepInner} ${r},0Z`;
    return `<svg class="moon" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${r}" cy="${r}" r="${r - 0.5}" fill="#252c47"/>${frac > 0.01 ? `<path d="${d}" fill="#e9e4d6"/>` : ''}</svg>`;
  }

  // Barra de la noche: crepúsculos, Luna, ventana oscura y Vía Láctea
  function nightBar(n, tz) {
    const W = 1000, top = 30, H = 64, bot = top + H;
    const t0 = (n.goldenStart || n.sunset) - 20 * 60000;
    const t1 = (n.sunrise || n.civilDawn) + 30 * 60000;
    const x = t => Math.max(0, Math.min(W, ((t - t0) / (t1 - t0)) * W));
    const parts = [];
    const band = (a, b, fill) => { if (a && b && b > a) parts.push(`<rect x="${x(a).toFixed(1)}" y="${top}" width="${(x(b) - x(a)).toFixed(1)}" height="${H}" fill="${fill}"/>`); };
    band(t0, n.goldenStart || n.sunset, '#3d4a73');
    band(n.goldenStart, n.sunset, '#d99a45');
    band(n.sunset, n.civil, '#8a4f6e');
    band(n.civil, n.nautical || n.civilDawn, '#323a74');
    band(n.nautical, n.astro || n.nauticalDawn, '#1b2250');
    band(n.astro, n.astroDawn, '#04060d');
    band(n.astroDawn || n.nautical, n.nauticalDawn, '#1b2250');
    band(n.nauticalDawn || n.civil, n.civilDawn, '#323a74');
    band(n.civilDawn, n.sunrise, '#8a4f6e');
    band(n.sunrise, t1, '#d99a45');
    // Luna: tramos de la noche cerrada que no son ventana oscura
    if (n.astroNight && n.moonFrac > 0.03) {
      let cur = n.astro;
      const segs = [];
      for (const [a, b] of n.windows) { if (a > cur) segs.push([cur, a]); cur = b; }
      if (cur < n.astroDawn) segs.push([cur, n.astroDawn]);
      for (const [a, b] of segs) {
        if (b - a < 5 * 60000) continue;
        parts.push(`<rect x="${x(a).toFixed(1)}" y="${top}" width="${(x(b) - x(a)).toFixed(1)}" height="${H}" fill="url(#vo-moonhatch)"/>`);
        if (x(b) - x(a) > 70) parts.push(`<text x="${((x(a) + x(b)) / 2).toFixed(1)}" y="${top + H / 2 + 5}" class="bar-lbl moon-lbl" text-anchor="middle">Luna fuera</text>`);
      }
    }
    // Estrellas en la ventana oscura (pseudoaleatorias, deterministas)
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const [a, b] of n.windows || []) {
      const xa = x(a), xb = x(b), count = Math.round((xb - xa) / 9);
      for (let i = 0; i < count; i++) {
        parts.push(`<circle cx="${(xa + rnd() * (xb - xa)).toFixed(1)}" cy="${(top + 4 + rnd() * (H - 18)).toFixed(1)}" r="${(0.5 + rnd() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}"/>`);
      }
      parts.push(`<path d="M${xa.toFixed(1)},${top - 6} V${top - 12} H${xb.toFixed(1)} V${top - 6}" class="bracket"/>`);
      if (xb - xa > 150) parts.push(`<text x="${((xa + xb) / 2).toFixed(1)}" y="${top - 16}" class="bar-lbl win-lbl" text-anchor="middle">Ventana oscura ${time(a, tz)}–${time(b, tz)}</text>`);
    }
    for (const [a, b] of n.mwWindows || []) {
      parts.push(`<rect x="${x(a).toFixed(1)}" y="${bot - 9}" width="${(x(b) - x(a)).toFixed(1)}" height="9" fill="#9d8cff" opacity=".9"/>`);
      if (x(b) - x(a) > 120) parts.push(`<text x="${(x(a) + 6).toFixed(1)}" y="${bot - 14}" class="bar-lbl mw-lbl">Vía Láctea</text>`);
    }
    // Horas
    const ticks = [];
    let h = Math.ceil(t0 / 3600000) * 3600000;
    for (; h < t1; h += 3600000) {
      const xx = x(h);
      ticks.push(`<line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${bot}" y2="${bot + 5}" class="tick"/>`);
      if (xx > 12 && xx < W - 12) ticks.push(`<text x="${xx.toFixed(1)}" y="${bot + 20}" class="tick-lbl" text-anchor="middle">${hourOf(h, tz)}h</text>`);
    }
    return `<svg class="nightbar" viewBox="0 0 ${W} ${bot + 26}" role="img" aria-label="Línea temporal de la noche: crepúsculos, Luna y ventana oscura">
<defs><pattern id="vo-moonhatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#2a3150"/><rect width="3" height="8" fill="#5a6283"/></pattern></defs>
<rect x="0" y="${top}" width="${W}" height="${H}" rx="6" fill="#0d1226"/>${parts.join('')}${ticks.join('')}</svg>`;
  }

  function stripColor(n) {
    if (!n.astroNight || n.score < 1) return '#283050';
    if (n.score >= 7) return '#f0c869';
    if (n.score >= 5) return '#a99bff';
    if (n.score >= 2.5) return '#5f5fa8';
    return '#3b4170';
  }

  // Tira de 30 noches
  function strip(next30) {
    const W = 1000, n = next30.length, cw = W / n, base = 112, maxH = 92;
    const cols = next30.map((d, i) => {
      const h = Math.max(3, Math.min(1, d.darkMin / 600) * maxH);
      const cx = i * cw + cw / 2;
      const wk = d.dow === 5 || d.dow === 6;
      const v = verdict(d);
      return `<g><title>${esc(longDate(d.date))}: ${v.text}, ${dur(d.darkMin)} de oscuridad, Luna ${pct(d.moonFrac)}</title>
${wk ? `<rect x="${(i * cw + 1).toFixed(1)}" y="2" width="${(cw - 2).toFixed(1)}" height="${base + 34}" rx="4" class="wk"/>` : ''}
<circle cx="${cx.toFixed(1)}" cy="9" r="5" fill="#e9e4d6" opacity="${(0.12 + d.moonFrac * 0.88).toFixed(2)}"/>
<rect x="${(i * cw + cw * 0.18).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(cw * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${stripColor(d)}"/>
<text x="${cx.toFixed(1)}" y="${base + 15}" text-anchor="middle" class="s-day${wk ? ' s-wk' : ''}">${+d.date.slice(8)}</text>
<text x="${cx.toFixed(1)}" y="${base + 28}" text-anchor="middle" class="s-dow">${'DLMXJVS'[d.dow]}</text></g>`;
    });
    return `<svg class="strip" viewBox="0 0 ${W} ${base + 36}" role="img" aria-label="Horas de oscuridad real en las próximas 30 noches">${cols.join('')}</svg>`;
  }

  function tonight(n, tz, opts) {
    opts = opts || {};
    const v = verdict(n);
    const w = n.windows || [];
    let lede;
    if (!n.astroNight) lede = 'En esta época el Sol no baja lo suficiente para que haya noche astronómica completa.';
    else if (!w.length) lede = `La Luna (${pct(n.moonFrac)} iluminada) estará sobre el horizonte durante toda la noche cerrada. Buena noche para observarla a ella, mala para la Vía Láctea y las nebulosas.`;
    else if (w.length === 1) lede = `Habrá oscuridad real de <strong>${time(w[0][0], tz)} a ${time(w[0][1], tz)}</strong>: ${dur(n.darkMin)} sin Sol ni Luna.`;
    else lede = `Habrá ${dur(n.darkMin)} de oscuridad real repartidas en ${w.length} tramos: ${w.map(([a, b]) => `${time(a, tz)}–${time(b, tz)}`).join(' y ')}.`;
    let moonTxt = `${n.moonName}, ${pct(n.moonFrac)}`;
    const ev = [];
    if (n.moonset) ev.push(`se pone ${time(n.moonset, tz)}`);
    if (n.moonrise) ev.push(`sale ${time(n.moonrise, tz)}`);
    if (ev.length) moonTxt += ` · ${ev.join(', ')}`;
    const mw = (n.mwWindows || []);
    const mwTxt = mw.length ? `${time(mw[0][0], tz)}–${time(mw[mw.length - 1][1], tz)} (${dur(n.mwMin)})` : (n.astroNight ? 'No visible esta noche' : '—');
    const title = opts.title || 'Esta noche';
    return `<div class="tonight-head"><h2>${esc(title)}${opts.dateKey ? ` <span class="sub">· ${esc(longDate(opts.dateKey))}</span>` : ''}</h2>
<p class="verdict ${v.cls}">${moonIcon(n.moonPhase, n.moonFrac, 18)} ${v.text}${n.astroNight ? ` <span class="score">${num(n.score.toFixed(1))}/10</span>` : ''}</p></div>
<p class="lede">${lede}</p>
<div class="scrollx">${nightBar(n, tz)}</div>
<dl class="facts">
<div><dt>Hora dorada</dt><dd>${time(n.goldenStart, tz)}–${time(n.sunset, tz)}</dd></div>
<div><dt>Puesta de sol</dt><dd>${time(n.sunset, tz)}</dd></div>
<div><dt>Fin del crepúsculo civil</dt><dd>${time(n.civil, tz)}</dd></div>
<div><dt>Noche cerrada</dt><dd>${n.astro ? `${time(n.astro, tz)}–${time(n.astroDawn, tz)}` : '—'}</dd></div>
<div><dt>Luna</dt><dd>${moonTxt}</dd></div>
<div><dt>Núcleo de la Vía Láctea</dt><dd>${mwTxt}</dd></div>
<div><dt>Amanecer</dt><dd>${time(n.sunrise, tz)}</dd></div>
</dl>
<p class="legend"><span><i class="lg lg-gold"></i>Hora dorada</span><span><i class="lg lg-tw"></i>Crepúsculos</span><span><i class="lg lg-dark"></i>Noche cerrada</span><span><i class="lg lg-moon"></i>Luna sobre el horizonte</span><span><i class="lg lg-mw"></i>Vía Láctea visible</span></p>`;
  }

  return { time, longDate, longDateY, shortDate, dateOfMs, monthName, nextDayKey, dur, pct, num, esc, verdict, moonIcon, nightBar, strip, tonight };
});
