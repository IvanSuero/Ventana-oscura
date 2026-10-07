// Páginas índice y temáticas.
const A = require('astronomy-engine');
const sky = require('./sky.js')(A);
const VO = require('./viz.js');
const cfg = require('../site.config.js');
const R = require('./render.js');
const { SHOWERS, COUNTRIES } = require('./data.js');
const { esc, time, longDate, longDateY, dateOfMs, monthName, dur, pct, num } = VO;

const MAD = 'Europe/Madrid';

function simplePage(ctx, title, description, inner, crumbItems, extraLd = []) {
  const cr = crumbItems ? R.crumbs(ctx, crumbItems) : null;
  const body = `${cr ? cr.html : ''}<article class="wrap prose">${inner}</article>`;
  return R.layout(ctx, { title, description, body, jsonld: [...(cr ? [cr.ld] : []), ...extraLd] });
}

// ---------- Inicio ----------
function home(ctx, { cities, places, data, eclipsePages, today }) {
  const { L } = ctx;
  const mad = cities.find(c => c.slug === 'madrid' && c.country === 'ES') || cities.find(c => c.country === 'ES') || cities[0];
  const md = data[mad.path];
  const tz = MAD;
  const nextNew = md.newMoons.find(t => t > Date.now() - 864e5);
  const nextShower = md.showers[0];
  const nextEcl = eclipsePages.find(e => e.countries.includes('ES'));
  const popularES = cities.filter(c => c.country === 'ES').slice(0, 24);
  const popularLA = cities.filter(c => c.country !== 'ES').slice(0, 12);
  const year = today.slice(0, 4);
  const title = `Ventana Oscura — ¿Cuándo es de noche de verdad? Estrellas, Luna y Vía Láctea en tu ciudad`;
  const description = 'Calcula al minuto cuándo no hay ni Sol ni Luna en el cielo de tu ciudad: la mejor hora para ver estrellas, la Vía Láctea, lluvias de estrellas y eclipses. Gratis, para España y Latinoamérica.';
  const n0 = md.next30[0];
  const body = `<section class="hero"><div class="wrap">
<p class="kicker">España y Latinoamérica · ${year}</p>
<h1>¿Cuándo es de noche <em>de verdad</em>?</h1>
<p class="intro">Que se haya puesto el Sol no significa que sea de noche. Calculamos, para cada lugar y cada fecha, la <strong>ventana oscura</strong>: las horas sin Sol ni Luna en las que aparecen las estrellas de verdad.</p>
<form class="finder" role="search" onsubmit="return false">
<label for="q" class="sr">Busca tu ciudad</label>
<input id="q" type="search" placeholder="Busca tu ciudad o pueblo…" autocomplete="off" spellcheck="false">
<button type="button" id="geo" class="btn">${'<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/></svg>'} Mi ubicación</button>
<ul id="results" class="results" role="listbox" hidden></ul>
</form>
</div></section>

<div class="wrap">
<section class="card tonight" id="esta-noche" aria-live="polite"><p class="kicker" id="live-where">Madrid · ejemplo</p>${VO.tonight(n0, tz, { dateKey: n0.date })}</section>

<div class="tiles">
<a class="tile" href="${L('calendario-lunar/')}"><span class="t-k">Próxima luna nueva</span><span class="t-v">${nextNew ? esc(dateOfMs(nextNew, tz)) : '—'}</span><span class="t-s">Las noches más oscuras del mes</span></a>
${nextShower ? `<a class="tile" href="${L('lluvias-de-estrellas/' + nextShower.slug + '/')}"><span class="t-k">Próxima lluvia de estrellas</span><span class="t-v">${esc(nextShower.name)} · ${esc(longDate(nextShower.date))}</span><span class="t-s">Luna al ${pct(nextShower.moonFrac)} esa noche</span></a>` : ''}
${nextEcl ? `<a class="tile" href="${L(nextEcl.path)}"><span class="t-k">Próximo eclipse de Sol en España</span><span class="t-v">${esc(nextEcl.label)}</span><span class="t-s">Hora y porcentaje en ${nextEcl.count} ciudades</span></a>` : ''}
</div>

${R.adSlot('home-1')}

<section class="card"><h2>Tres cosas que calculamos para cada noche</h2>
<div class="explain">
<div><h3><span class="lg lg-dark"></span>La ventana oscura</h3><p>El Sol a más de 18° bajo el horizonte y la Luna fuera del cielo. Solo en esas horas se ve la Vía Láctea a simple vista y las fotos de cielo profundo salen limpias.</p></div>
<div><h3><span class="lg lg-mw"></span>El núcleo de la Vía Láctea</h3><p>La zona más brillante de nuestra galaxia, hacia Sagitario. Depende de la época del año, de tu latitud y de que la ventana oscura coincida con ella.</p></div>
<div><h3><span class="lg lg-gold"></span>Hora dorada y crepúsculos</h3><p>Cuándo cae la luz cálida para fotografía, cuándo termina el crepúsculo civil (anochecer) y cuándo empieza la noche cerrada.</p></div>
</div></section>

<section class="card"><h2>Ciudades de España</h2><ul class="chips">${popularES.map(c => `<li><a href="${L(c.path)}">${esc(c.name)}</a></li>`).join('')}<li><a class="more" href="${L('espana/')}">Ver las ${cities.filter(c => c.country === 'ES').length} →</a></li></ul>
<h2 class="mt">Latinoamérica</h2><ul class="chips">${popularLA.map(c => `<li><a href="${L(c.path)}">${esc(c.name)}</a></li>`).join('')}<li><a class="more" href="${L('ciudades/')}">Todos los países →</a></li></ul></section>

<section class="card"><h2>Lugares de cielo oscuro en España</h2><ul class="links-grid">${places.map(p => `<li><a href="${L(p.path)}">${esc(p.name)}</a><span>${esc(p.area)}</span></li>`).join('')}</ul></section>
</div>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.siteName, url: R.abs(''), inLanguage: 'es', description }];
  return R.layout(ctx, { title, description, body, jsonld: ld, bodyClass: 'home', pageData: { kind: 'home', lat: mad.lat, lon: mad.lon, tz, name: 'Madrid' } });
}

// ---------- Índices de países ----------
function countryPage(ctx, code, cities) {
  const { L } = ctx;
  const c = COUNTRIES[code];
  const list = cities.filter(x => x.country === code);
  let inner;
  if (code === 'ES') {
    const groups = {};
    for (const x of list) (groups[x.region || 'Otras'] = groups[x.region || 'Otras'] || []).push(x);
    inner = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'es')).map(r =>
      `<section class="card"><h2>${esc(r)}</h2><ul class="chips">${groups[r].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(x => `<li><a href="${L(x.path)}">${esc(x.name)}</a></li>`).join('')}</ul></section>`).join('');
  } else {
    inner = `<section class="card"><ul class="chips">${list.map(x => `<li><a href="${L(x.path)}">${esc(x.name)}</a></li>`).join('')}</ul></section>`;
  }
  return simplePage(ctx, `Ver estrellas en ${c.name}: hora del anochecer y noches oscuras por ciudad`,
    `Elige tu ciudad de ${c.name} y consulta a qué hora anochece, cuándo hay noche cerrada sin Luna, la temporada de la Vía Láctea y las mejores noches del año.`,
    `<h1>Ver estrellas en ${esc(c.name)}</h1><p class="intro">${list.length} ciudades. En cada una calculamos la ventana oscura de esta noche, las próximas 30 noches y las mejores fechas del año.</p>${inner}`,
    [['', 'Inicio'], [ctx.path, c.name]]);
}

function countriesIndex(ctx, cities) {
  const { L } = ctx;
  const codes = Object.keys(COUNTRIES).filter(k => cities.some(c => c.country === k));
  return simplePage(ctx, 'Ciudades por país — Ventana Oscura', 'Consulta el cielo nocturno de ciudades de España y de toda Latinoamérica.',
    `<h1>Ciudades por país</h1><section class="card"><ul class="links-grid">${codes.map(k => `<li><a href="${L(COUNTRIES[k].slug + '/')}">${esc(COUNTRIES[k].name)}</a><span>${cities.filter(c => c.country === k).length} ciudades</span></li>`).join('')}</ul></section>`,
    [['', 'Inicio'], [ctx.path, 'Países']]);
}

function placesIndex(ctx, places, data) {
  const { L } = ctx;
  const rows = places.map(p => {
    const n = data[p.path].next30[0];
    const v = VO.verdict(n);
    return `<li><a href="${L(p.path)}">${esc(p.name)}</a><span>${esc(p.area)}</span><span class="pill ${v.cls}">Esta noche: ${v.text.toLowerCase()}</span></li>`;
  }).join('');
  return simplePage(ctx, 'Mejores lugares para ver estrellas en España: horarios de noche oscura',
    'Reservas Starlight, observatorios y sierras con poca contaminación lumínica en España, con la ventana oscura calculada para cada noche.',
    `<h1>Lugares de cielo oscuro en España</h1><p class="intro">Reservas Starlight, observatorios y sierras alejadas de las ciudades. Para cada uno calculamos cuándo hay oscuridad real esta noche y en los próximos meses. Las coordenadas son aproximadas al centro de la zona.</p><section class="card"><ul class="links-grid tall">${rows}</ul></section>`,
    [['', 'Inicio'], [ctx.path, 'Lugares oscuros']]);
}

// ---------- Lluvias de estrellas ----------
function showersHub(ctx, today) {
  const { L } = ctx;
  const y0 = +today.slice(0, 4);
  const rows = [];
  for (const yy of [y0, y0 + 1]) for (const s of SHOWERS) {
    const key = `${yy}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}`;
    if (key < today) continue;
    const mi = sky.moonInfo(new Date(Date.UTC(yy, s.m - 1, s.d + 1, 0)));
    rows.push({ s, key, frac: mi.frac });
  }
  return simplePage(ctx, `Lluvias de estrellas ${y0} y ${y0 + 1}: calendario y fase de la Luna`,
    `Fechas de las Perseidas, Gemínidas, Cuadrántidas y el resto de lluvias de estrellas de ${y0} y ${y0 + 1}, con la Luna de cada noche y la oscuridad en tu ciudad.`,
    `<h1>Lluvias de estrellas ${y0}–${y0 + 1}</h1><p class="intro">La fecha del pico es aproximada (puede variar un día). Lo que más decide si verás muchos meteoros es la Luna: con Luna llena desaparecen casi todos.</p>
<section class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lluvia</th><th>Noche del pico</th><th>Actividad máx.</th><th>Luna</th></tr></thead><tbody>
${rows.map(r => `<tr><td><a href="${L('lluvias-de-estrellas/' + r.s.slug + '/')}">${esc(r.s.name)}</a></td><td>${esc(longDateY(r.key))}</td><td>hasta ${r.s.zhr}/h</td><td>${pct(r.frac)} ${r.frac < 0.3 ? '<span class="pill v-great">favorable</span>' : r.frac > 0.7 ? '<span class="pill v-bad">desfavorable</span>' : ''}</td></tr>`).join('')}
</tbody></table></div></section>
<section class="card prose"><h2>Cómo ver una lluvia de estrellas</h2><p>Busca un sitio lejos de farolas, túmbate mirando hacia la parte más oscura del cielo (no hace falta mirar al radiante) y espera 20 minutos a que tus ojos se adapten sin mirar el móvil. La mayoría de lluvias son más activas después de medianoche, cuando tu lado de la Tierra «mira» hacia donde avanza el planeta.</p></section>`,
    [['', 'Inicio'], [ctx.path, 'Lluvias de estrellas']]);
}

function showerPage(ctx, s, cities, data, today) {
  const { L } = ctx;
  const sample = cities.filter(c => c.country === 'ES').slice(0, 25).concat(cities.filter(c => c.country !== 'ES').slice(0, 15));
  const rows = sample.map(c => ({ c, r: (data[c.path].showers || []).find(x => x.slug === s.slug) })).filter(o => o.r);
  const first = rows[0] && rows[0].r;
  const y = first ? first.date.slice(0, 4) : today.slice(0, 4);
  const title = `${s.name} ${y}: cuándo y a qué hora verlas en tu ciudad`;
  const description = `${s.name} ${y}: noche del pico${first ? ` el ${longDate(first.date)}` : ''}, fase de la Luna y horas de oscuridad real ciudad por ciudad en España y Latinoamérica.`;
  const inner = `<h1>${esc(s.name)} ${y}</h1>
<p class="intro">${esc(s.note)} Actividad máxima teórica: hasta ${s.zhr} meteoros por hora con cielo perfecto.</p>
${first ? `<section class="card"><p><strong>Noche del pico:</strong> ${esc(longDateY(first.date))} al ${+VO.nextDayKey(first.date).slice(8)}. <strong>Luna:</strong> ${esc(first.moonName.toLowerCase())}, ${pct(first.moonFrac)} iluminada.</p></section>` : ''}
${R.adSlot('shower-1')}
<section class="card"><h2>Oscuridad esa noche, por ciudad</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ciudad</th><th>Noche cerrada</th><th>Oscuridad real</th><th>Mejor tramo</th><th>Condiciones</th></tr></thead><tbody>
${rows.map(({ c, r }) => { const rt = R.showerRating(r); const w = (r.windows || []).slice().sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0]; return `<tr><td><a href="${L(c.path)}">${esc(c.name)}</a><br><small>${esc(c.region || c.countryName)}</small></td><td>${r.astro ? `${time(r.astro, c.tz)}–${time(r.astroDawn, c.tz)}` : '—'}</td><td>${dur(r.darkMin)}</td><td>${w ? `${time(w[0], c.tz)}–${time(w[1], c.tz)}` : '—'}</td><td><span class="pill ${rt.cls}">${rt.t}</span></td></tr>`; }).join('')}
</tbody></table></div><p class="fine">¿No está tu ciudad? Búscala en el <a href="${L('')}">inicio</a>: cada ciudad tiene sus próximas lluvias calculadas.</p></section>`;
  return simplePage(ctx, title, description, inner, [['', 'Inicio'], ['lluvias-de-estrellas/', 'Lluvias de estrellas'], [ctx.path, s.name]]);
}

// ---------- Eclipses ----------
function collectEclipses(cities, data) {
  const map = {};
  for (const c of cities) for (const e of data[c.path].solar) {
    const key = new Date(e.peak).toISOString().slice(0, 10);
    e.dateKey = key;
    (map[key] = map[key] || []).push({ c, e });
  }
  return Object.keys(map).sort().filter(k => map[k].length >= 5).map(k => {
    const list = map[k].sort((a, b) => b.e.obscuration - a.e.obscuration);
    const kinds = new Set(list.map(o => o.e.kind));
    const kind = kinds.has('total') ? 'total' : kinds.has('annular') ? 'annular' : 'partial';
    const d = new Date(k + 'T12:00:00Z');
    const label = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    return { key: k, path: `eclipses/${k}/`, list, kind, label, count: list.length, countries: [...new Set(list.map(o => o.c.country))] };
  });
}

function obsPct(e) {
  const v = e.obscuration * 100;
  return (e.kind === 'partial' && v >= 99 ? num(v.toFixed(1)) : Math.round(v)) + ' %';
}
function secs(msDur) { const t = Math.round(msDur / 1000); return `${Math.floor(t / 60)} min ${t % 60} s`; }

function eclipsePage(ctx, ecl) {
  const { L } = ctx;
  const kindTxt = { total: 'total', annular: 'anular', partial: 'parcial' }[ecl.kind];
  const title = `Eclipse ${kindTxt} de Sol del ${ecl.label}: hora y porcentaje en cada ciudad`;
  const top = ecl.list[0];
  const description = `A qué hora se ve el eclipse de Sol del ${ecl.label} y qué porcentaje del Sol se tapa en ${ecl.count} ciudades. Máximo del ${Math.round(top.e.obscuration * 100)} % en ${top.c.name}.`;
  const byCountry = {};
  for (const o of ecl.list) (byCountry[o.c.countryName] = byCountry[o.c.countryName] || []).push(o);
  const order = Object.keys(byCountry).sort((a, b) => (a === 'España' ? -1 : b === 'España' ? 1 : a.localeCompare(b, 'es')));
  const inner = `<h1>Eclipse ${kindTxt} de Sol del ${esc(ecl.label)}</h1>
<p class="intro">Hora local de inicio, máximo y final, y porcentaje del disco solar tapado en ${ecl.count} ciudades. Calculado para la posición exacta de cada ciudad.</p>
<section class="card warn"><strong>Protege tus ojos.</strong> Usa gafas de eclipse homologadas (ISO 12312-2) durante todas las fases parciales. Las gafas de sol no sirven.</section>
${(() => { const tot = ecl.list.filter(o => o.e.kind === ecl.kind && ecl.kind !== 'partial'); if (!tot.length) return ''; const longest = tot.slice().sort((a, b) => (b.e.totalEnd - b.e.totalBegin) - (a.e.totalEnd - a.e.totalBegin))[0]; return `<section class="card"><h2>¿Dónde será ${ecl.kind === 'total' ? 'total' : 'anular'}?</h2><p>En ${tot.length} de las ciudades calculadas, entre ellas ${tot.slice(0, 8).map(o => `<a href="${L(o.c.path)}#eclipses">${esc(o.c.name)}</a>`).join(', ')}. La fase ${ecl.kind === 'total' ? 'total' : 'anular'} más larga de la lista es la de ${esc(longest.c.name)}: ${secs(longest.e.totalEnd - longest.e.totalBegin)}.</p></section>`; })()}
${R.adSlot('eclipse-1')}
${order.map(cn => `<section class="card"><h2>${esc(cn)}</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ciudad</th><th>Tipo</th><th>Sol tapado</th><th>Empieza</th><th>Máximo</th><th>Termina</th><th>${ecl.kind === 'partial' ? '' : (ecl.kind === 'total' ? 'Totalidad' : 'Anularidad')}</th></tr></thead><tbody>
${byCountry[cn].map(({ c, e }) => `<tr><td><a href="${L(c.path)}#eclipses">${esc(c.name)}</a>${c.region ? `<br><small>${esc(c.region)}</small>` : ''}</td><td>${e.kind === 'total' ? '<span class="pill v-great">Total</span>' : e.kind === 'annular' ? '<span class="pill v-good">Anular</span>' : 'Parcial'}</td><td><div class="meter"><span style="width:${Math.round(e.obscuration * 100)}%"></span></div>${obsPct(e)}</td><td>${e.beginAlt > 0 ? time(e.begin, c.tz) : 'Sol bajo horizonte'}</td><td>${e.peakAlt > 0 ? time(e.peak, c.tz) : 'Sol bajo horizonte'}</td><td>${e.endAlt > 0 ? time(e.end, c.tz) : 'Sol ya puesto'}</td><td>${e.totalBegin && e.kind !== 'partial' ? secs(e.totalEnd - e.totalBegin) : ''}</td></tr>`).join('')}
</tbody></table></div></section>`).join('')}`;
  return simplePage(ctx, title, description, inner, [['', 'Inicio'], ['eclipses/', 'Eclipses'], [ctx.path, ecl.label]]);
}

function eclipsesHub(ctx, ecls, today) {
  const { L } = ctx;
  const y0 = +today.slice(0, 4);
  const lunar = [];
  let l = A.SearchLunarEclipse(new Date(today));
  while (lunar.length < 8) { if (l.kind !== 'penumbral') lunar.push(l); l = A.NextLunarEclipse(l.peak); }
  const kindTxt = { total: 'Total', annular: 'Anular', partial: 'Parcial' };
  return simplePage(ctx, `Próximos eclipses en España y Latinoamérica (${y0}–${y0 + 5})`, 'Calendario de eclipses de Sol y de Luna con hora local y porcentaje de ocultación para cada ciudad de España y Latinoamérica.',
    `<h1>Próximos eclipses</h1><p class="intro">Elige un eclipse para ver a qué hora y con qué porcentaje se ve desde cada ciudad.</p>
<section class="card"><h2>Eclipses de Sol</h2><ul class="links-grid tall">${ecls.map(e => `<li><a href="${L(e.path)}">${esc(e.label)}</a><span>${kindTxt[e.kind]} en alguna ciudad · visible en ${e.count} ciudades de ${e.countries.length} países</span></li>`).join('')}</ul></section>
<section class="card"><h2>Eclipses de Luna</h2><p class="muted">Se ven desde cualquier lugar donde la Luna esté sobre el horizonte en ese momento. Hora peninsular española.</p><ul class="events">${lunar.map(e => `<li><strong>${esc(dateOfMs(e.peak.date.getTime(), MAD, true))}</strong>: eclipse ${e.kind === 'total' ? 'total' : 'parcial'}, máximo a las ${time(e.peak.date.getTime(), MAD)} (hora de Madrid).</li>`).join('')}</ul><p class="fine">En la página de cada ciudad indicamos solo los eclipses de Luna visibles desde allí.</p></section>`,
    [['', 'Inicio'], [ctx.path, 'Eclipses']]);
}

// ---------- Calendario lunar ----------
function lunarCalendar(ctx, today) {
  const y0 = +today.slice(0, 4);
  const phases = sky.lunarPhases(new Date(Date.UTC(y0, 0, 1)), new Date(Date.UTC(y0 + 2, 0, 1)));
  const names = ['Luna nueva', 'Cuarto creciente', 'Luna llena', 'Cuarto menguante'];
  const icons = [[0, 0], [90, 0.5], [180, 1], [270, 0.5]];
  const years = [y0, y0 + 1].map(yy => {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const ph = phases.filter(p => { const k = new Intl.DateTimeFormat('en-CA', { timeZone: MAD, year: 'numeric', month: '2-digit' }).format(p.date); return k === `${yy}-${String(m).padStart(2, '0')}`; });
      months.push(`<div class="month"><h3>${monthName(m)}</h3><ul>${ph.map(p => `<li>${VO.moonIcon(icons[p.quarter][0], icons[p.quarter][1], 14)} <span>${names[p.quarter]}</span> <b>${new Intl.DateTimeFormat('es-ES', { timeZone: MAD, day: 'numeric', weekday: 'short' }).format(p.date)}</b> ${time(p.date.getTime(), MAD)}</li>`).join('')}</ul></div>`);
    }
    return `<section class="card"><h2>Calendario lunar ${yy}</h2><div class="months">${months.join('')}</div></section>`;
  });
  return simplePage(ctx, `Calendario lunar ${y0} y ${y0 + 1}: fases de la Luna en España`, `Fechas y horas de la luna nueva, llena y cuartos de ${y0} y ${y0 + 1} en hora peninsular española. Las lunas nuevas marcan las mejores noches para ver estrellas.`,
    `<h1>Calendario lunar ${y0} y ${y0 + 1}</h1><p class="intro">Hora peninsular española (en Canarias, una hora menos). Las noches alrededor de la luna nueva son las más oscuras del mes; en la página de tu ciudad tienes la mejor noche concreta.</p>${years.join('')}`,
    [['', 'Inicio'], [ctx.path, 'Calendario lunar']]);
}

// ---------- Páginas de texto ----------
function howItWorks(ctx) {
  return simplePage(ctx, 'Cómo calculamos la ventana oscura — Ventana Oscura', 'Qué es la ventana oscura, los crepúsculos civil, náutico y astronómico, cómo tenemos en cuenta la Luna y la Vía Láctea y con qué precisión.',
    `<h1>Cómo se calcula</h1>
<p class="intro">Todo lo que ves en este sitio es geometría: la posición del Sol, la Luna y el centro de la galaxia vistos desde unas coordenadas concretas. No hay estimaciones a ojo ni datos copiados.</p>
<section class="card prose">
<h2>Los crepúsculos</h2>
<p>Tras la puesta de sol el cielo se oscurece por etapas. El <strong>crepúsculo civil</strong> termina cuando el Sol está 6° bajo el horizonte: es lo que solemos llamar «anochecer». El <strong>náutico</strong>, a −12°, y el <strong>astronómico</strong>, a −18°. A partir de ahí empieza la <strong>noche cerrada</strong>: el Sol ya no ilumina nada del cielo.</p>
<h2>La Luna</h2>
<p>Una Luna llena sobre el horizonte aclara el cielo tanto como para ocultar la Vía Láctea. Por eso solo contamos como oscuridad real los minutos en que la Luna está bajo el horizonte (o es prácticamente nueva, con menos de un 3 % iluminado). Recorremos cada noche en pasos de 10 minutos.</p>
<h2>La ventana oscura</h2>
<p>Son los tramos de noche cerrada sin Luna. La nota de 0 a 10 de cada noche da hasta 8 puntos por horas de oscuridad real (máximo con 7 horas) y hasta 2 por horas con el núcleo de la Vía Láctea visible.</p>
<h2>La Vía Láctea</h2>
<p>Consideramos visible el núcleo galáctico (en Sagitario) cuando está a más de 10° sobre el horizonte durante la ventana oscura. Por debajo, la atmósfera y la neblina lo apagan casi siempre.</p>
<h2>Precisión y límites</h2>
<p>Usamos <a href="https://github.com/cosinekitty/astronomy">Astronomy Engine</a>, una librería de efemérides con precisión de alrededor de un minuto en salidas y puestas. Calculamos para el centro de cada ciudad y a nivel del mar; montañas en el horizonte pueden adelantar la puesta unos minutos. <strong>No incluimos nubes ni contaminación lumínica</strong>: consulta la previsión del tiempo y aléjate de la ciudad.</p>
</section>`,
    [['', 'Inicio'], [ctx.path, 'Cómo se calcula']]);
}

function legal(ctx) {
  return simplePage(ctx, 'Aviso legal — Ventana Oscura', 'Aviso legal de Ventana Oscura.',
    `<h1>Aviso legal</h1><section class="card prose"><p>Este sitio web ofrece información astronómica calculada automáticamente con fines informativos y divulgativos. Aunque se calcula con efemérides precisas, no garantizamos la exactitud para usos críticos.</p><p>Titular: <em>[nombre del titular]</em>. Contacto: <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a>.</p><p>Los datos de ciudades proceden de GeoNames bajo licencia Creative Commons Attribution 4.0.</p></section>`,
    [['', 'Inicio'], [ctx.path, 'Aviso legal']]);
}

function privacy(ctx) {
  return simplePage(ctx, 'Privacidad y cookies — Ventana Oscura', 'Política de privacidad y cookies de Ventana Oscura.',
    `<h1>Privacidad y cookies</h1><section class="card prose"><p>Este sitio no tiene registro de usuarios ni guarda datos personales. Si pulsas «Mi ubicación», tus coordenadas se usan solo dentro de tu navegador para hacer el cálculo y nunca se envían a ningún servidor.</p>${cfg.adsenseClient ? '<p>Mostramos anuncios de Google AdSense. Google puede usar cookies para personalizar los anuncios según tus visitas a este y otros sitios. Puedes gestionarlo en <a href="https://adssettings.google.com">la configuración de anuncios de Google</a>.</p>' : ''}${cfg.amazonTag ? '<p>Algunos enlaces son de afiliado de Amazon: si compras a través de ellos, el sitio recibe una comisión.</p>' : ''}<p>Contacto: <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a>.</p></section>`,
    [['', 'Inicio'], [ctx.path, 'Privacidad']]);
}

function notFound(ctx) {
  return simplePage(ctx, 'Página no encontrada — Ventana Oscura', 'Página no encontrada.', `<h1>Aquí no hay nada… ni siquiera estrellas</h1><p class="intro">La página que buscas no existe. Vuelve al <a href="${ctx.L('')}">inicio</a> y busca tu ciudad.</p>`);
}

module.exports = { home, countryPage, countriesIndex, placesIndex, showersHub, showerPage, collectEclipses, eclipsePage, eclipsesHub, lunarCalendar, howItWorks, legal, privacy, notFound };
