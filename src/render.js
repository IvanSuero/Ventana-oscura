// Plantillas HTML de todas las páginas.
const VO = require('./viz.js');
const cfg = require('../site.config.js');
const { esc, time, longDate, longDateY, shortDate, dateOfMs, monthName, dur, pct, num } = VO;

const ASSET_VER = Date.now().toString(36);

// ---------- Enlaces ----------
function makeLinker(fromPath, relative) {
  return function L(to) {
    if (!relative) return cfg.basePath + to;
    const depth = fromPath ? fromPath.split('/').filter(Boolean).length : 0;
    const up = '../'.repeat(depth);
    if (to === '' || to.endsWith('/')) return up + to + 'index.html';
    return up + to;
  };
}
const abs = p => cfg.siteUrl + cfg.basePath + p;

// ---------- Layout ----------
function layout(ctx, { title, description, body, jsonld = [], pageData = null, bodyClass = '', ogType = 'website' }) {
  const L = ctx.L;
  const nav = [['espana/', 'Ciudades'], ['lugares/', 'Lugares oscuros'], ['lluvias-de-estrellas/', 'Lluvias de estrellas'], ['eclipses/', 'Eclipses'], ['calendario-lunar/', 'Calendario lunar']];
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(ctx.path)}">
<meta property="og:type" content="${ogType}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${abs(ctx.path)}"><meta property="og:site_name" content="${cfg.siteName}"><meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#070a16">
${cfg.googleVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleVerification)}">` : ''}
<link rel="icon" href="${L('assets/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${L('assets/style.css')}?v=${ASSET_VER}">
${cfg.adsenseClient ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsenseClient)}" crossorigin="anonymous"></script>` : ''}
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Saltar al contenido</a>
<header class="site-head"><div class="wrap">
<a class="brand" href="${L('')}">${logo()}<span>Ventana<b>Oscura</b></span></a>
<nav aria-label="Principal">${nav.map(([p, t]) => `<a href="${L(p)}"${ctx.path.startsWith(p) ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
</div></header>
<main id="main">${body}</main>
<footer class="site-foot"><div class="wrap">
<div><p class="brand small">${logo()}<span>Ventana<b>Oscura</b></span></p><p>${esc(cfg.tagline)}. Calculado para cada noche y cada lugar, sin pronósticos inventados: solo geometría del cielo.</p></div>
<div><h3>Explorar</h3><ul>${nav.map(([p, t]) => `<li><a href="${L(p)}">${t}</a></li>`).join('')}<li><a href="${L('ciudades/')}">Todos los países</a></li></ul></div>
<div><h3>Sitio</h3><ul><li><a href="${L('como-funciona/')}">Cómo se calcula</a></li><li><a href="${L('aviso-legal/')}">Aviso legal</a></li><li><a href="${L('privacidad/')}">Privacidad y cookies</a></li></ul></div>
<p class="credits">Efemérides calculadas con <a href="https://github.com/cosinekitty/astronomy">Astronomy Engine</a>. Datos de ciudades de <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0). Las horas son locales de cada lugar. La nubosidad no está incluida: consulta también la previsión del tiempo.</p>
</div></footer>
${pageData ? `<script>window.VO_PAGE=${JSON.stringify(pageData)};</script>
<script src="${L('assets/astronomy.browser.min.js')}" defer></script>
<script src="${L('assets/sky.js')}?v=${ASSET_VER}" defer></script>
<script src="${L('assets/viz.js')}?v=${ASSET_VER}" defer></script>
<script src="${L('assets/app.js')}?v=${ASSET_VER}" defer></script>` : ''}
</body>
</html>`;
}

function logo() {
  return `<svg class="logo" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="7" fill="#04060d" stroke="#2c3563"/><rect x="2" y="21" width="28" height="9" rx="0" fill="#1b2250"/><path d="M2 21h28v2H2z" fill="#d99a45"/><circle cx="10" cy="9" r="1.2" fill="#fff"/><circle cx="19" cy="13" r=".8" fill="#fff" opacity=".8"/><circle cx="24" cy="7" r="1" fill="#fff" opacity=".9"/><path d="M5 18 Q16 6 27 16" stroke="#9d8cff" stroke-width="2.2" fill="none" opacity=".85"/></svg>`;
}

function crumbs(ctx, items) {
  const L = ctx.L;
  const html = `<nav class="crumbs" aria-label="Migas de pan"><ol>${items.map(([p, t], i) => i === items.length - 1 ? `<li aria-current="page">${esc(t)}</li>` : `<li><a href="${L(p)}">${esc(t)}</a></li>`).join('')}</ol></nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([p, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, item: abs(p) })) };
  return { html, ld };
}

function faqBlock(faqs) {
  const html = `<section class="card faq" id="preguntas"><h2>Preguntas frecuentes</h2>${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${f.a}</p></details>`).join('')}</section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })) };
  return { html, ld };
}

function adSlot(name) {
  if (!cfg.adsenseClient) return '';
  return `<div class="ad" aria-label="Publicidad"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(cfg.adsenseClient)}" data-ad-format="auto" data-full-width-responsive="true" data-ad-slot-name="${name}"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`;
}

function gearBlock() {
  if (!cfg.amazonTag) return '';
  const items = [
    ['Linterna de luz roja', 'linterna luz roja astronomia', 'Mantiene tu vista adaptada a la oscuridad.'],
    ['Prismáticos 10x50', 'prismaticos 10x50', 'El mejor primer instrumento: muestran cúmulos y la galaxia de Andrómeda.'],
    ['Trípode para cámara', 'tripode camara fotos', 'Imprescindible para fotografiar la Vía Láctea.'],
    ['Planisferio celeste', 'planisferio celeste', 'Mapa giratorio del cielo, sin pantalla ni batería.'],
  ];
  return `<section class="card gear"><h2>Para tu próxima salida</h2><ul>${items.map(([t, q, d]) => `<li><a rel="sponsored nofollow" href="https://www.amazon.es/s?k=${encodeURIComponent(q)}&tag=${encodeURIComponent(cfg.amazonTag)}">${t}</a><span>${d}</span></li>`).join('')}</ul><p class="fine">Enlaces de afiliado: si compras, el sitio recibe una pequeña comisión sin coste para ti.</p></section>`;
}

// ---------- Bloques de la página de ubicación ----------
function lunationTable(d, tz) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Luna nueva</th><th>Mejor noche</th><th>Oscuridad</th><th>Vía Láctea</th><th>Mejor fin de semana</th></tr></thead><tbody>
${d.lunations.map(l => `<tr><td>${dateOfMs(l.newMoon, tz).replace(/^\w+, /, '')}</td><td><strong>${esc(longDate(l.best.date))}</strong> <span class="pill ${VO.verdict(l.best).cls}">${num(l.best.score.toFixed(1))}</span></td><td>${dur(l.best.darkMin)}</td><td>${l.best.mwMin ? dur(l.best.mwMin) : '—'}</td><td>${l.bestWeekend ? `${esc(longDate(l.bestWeekend.date))} · ${dur(l.bestWeekend.darkMin)}` : '—'}</td></tr>`).join('')}
</tbody></table></div>`;
}

function twilightTableHTML(d, tz) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Puesta de sol</th><th>Anochece<br><small>(fin crepúsculo civil)</small></th><th>Noche cerrada</th><th>Amanecer<br><small>(día siguiente)</small></th></tr></thead><tbody>
${d.twilightTable.map(r => `<tr><td>${shortDate(r.date)} ${r.date.slice(0, 4)}</td><td>${time(r.sunset, tz)}</td><td>${time(r.civil, tz)}</td><td>${r.astro ? time(r.astro, tz) : 'no llega'}</td><td>${time(r.sunrise, tz)}</td></tr>`).join('')}
</tbody></table></div>`;
}

function mwSeasonInfo(d) {
  const months = d.mwSeason.filter(m => m.mwMin > 0);
  if (!months.length) return null;
  const best = d.mwSeason.reduce((a, b) => (b.mwMin > a.mwMin ? b : a));
  // Rango continuo de meses con visibilidad (puede cruzar fin de año en el hemisferio sur)
  const on = d.mwSeason.map(m => m.mwMin >= 30);
  let startIdx = on.findIndex((v, i) => v && !on[(i + 11) % 12]);
  if (startIdx < 0) startIdx = on.indexOf(true);
  let endIdx = startIdx;
  while (on[(endIdx + 1) % 12] && (endIdx + 1) % 12 !== startIdx) endIdx = (endIdx + 1) % 12;
  return { best, from: startIdx >= 0 ? startIdx + 1 : null, to: endIdx + 1, gcMax: Math.max(...d.mwSeason.map(m => m.gcMaxAlt)) };
}

function mwSeasonChart(d) {
  const W = 1000, H = 150, base = 118, cw = W / 12, max = Math.max(240, ...d.mwSeason.map(m => m.mwMin));
  const bars = d.mwSeason.map((m, i) => {
    const h = (m.mwMin / max) * 100;
    return `<g><title>${monthName(m.m)}: ${dur(m.mwMin)} con el núcleo visible (sin Luna)</title><rect x="${(i * cw + cw * 0.2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${(cw * 0.6).toFixed(1)}" height="${Math.max(h, 2).toFixed(1)}" rx="3" fill="${m.mwMin ? '#9d8cff' : '#283050'}"/>
<text x="${(i * cw + cw / 2).toFixed(1)}" y="${base + 20}" text-anchor="middle" class="s-day">${monthName(m.m).slice(0, 3)}</text>${m.mwMin >= 60 ? `<text x="${(i * cw + cw / 2).toFixed(1)}" y="${(base - h - 6).toFixed(1)}" text-anchor="middle" class="s-dow">${Math.round(m.mwMin / 60)}h</text>` : ''}</g>`;
  });
  return `<svg class="strip" viewBox="0 0 ${W} ${H}" role="img" aria-label="Horas de visibilidad del núcleo de la Vía Láctea por mes">${bars.join('')}</svg>`;
}

function showerRating(s) {
  if (!s.astroNight) return { cls: 'v-none', t: 'Sin noche cerrada' };
  if (s.moonFrac < 0.25 || s.darkMin >= 360) return { cls: 'v-great', t: 'Muy buena' };
  if (s.moonFrac < 0.6 || s.darkMin >= 200) return { cls: 'v-good', t: 'Aceptable' };
  return { cls: 'v-bad', t: 'Luna molesta' };
}

function showersTable(d, ctx) {
  const rows = d.showers.slice(0, 6);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lluvia</th><th>Noche del pico</th><th>Luna</th><th>Oscuridad real</th><th>Condiciones</th></tr></thead><tbody>
${rows.map(s => { const r = showerRating(s); return `<tr><td><a href="${ctx.L('lluvias-de-estrellas/' + s.slug + '/')}">${esc(s.name)}</a><br><small>hasta ${s.zhr}/h</small></td><td>${esc(longDate(s.date))} al ${+VO.nextDayKey(s.date).slice(8)}, ${s.date.slice(0, 4)}</td><td>${pct(s.moonFrac)}</td><td>${dur(s.darkMin)}</td><td><span class="pill ${r.cls}">${r.t}</span></td></tr>`; }).join('')}
</tbody></table></div>`;
}

const ECL_KIND = { total: 'total', annular: 'anular', partial: 'parcial' };
function solarSentence(e, tz, name) {
  const kind = ECL_KIND[e.kind];
  const when = dateOfMs(e.peak, tz, true);
  let s = `<strong>${esc(when)}</strong>: eclipse ${kind} desde ${esc(name)}, con el ${Math.round(e.obscuration * 100)} % del Sol tapado`;
  if (e.peakAlt > 0) s += ` a las ${time(e.peak, tz)} (Sol a ${Math.round(e.peakAlt)}° de altura)`;
  else s += ` (el máximo ocurre con el Sol bajo el horizonte; solo se ve una parte)`;
  if (e.totalBegin && (e.kind === 'total' || e.kind === 'annular')) s += `. Fase ${e.kind === 'total' ? 'total' : 'anular'} de ${time(e.totalBegin, tz)} a ${time(e.totalEnd, tz)}`;
  s += `. Empieza ${e.beginAlt > 0 ? `a las ${time(e.begin, tz)}` : 'antes de la salida del Sol'} y termina ${e.endAlt > 0 ? `a las ${time(e.end, tz)}` : 'con el Sol ya puesto'}.`;
  return s;
}
const LUNAR_KIND = { total: 'total', partial: 'parcial' };
function lunarSentence(e, tz) {
  return `<strong>${esc(dateOfMs(e.peak, tz, true))}</strong>: eclipse ${LUNAR_KIND[e.kind] || e.kind} de Luna, máximo a las ${time(e.peak, tz)} con la Luna a ${e.alt}° de altura${e.kind === 'total' ? ` (totalidad de unos ${Math.round(e.sdTotal * 2)} minutos)` : ''}.`;
}

function locationPage(ctx, loc, d, extra) {
  const { L } = ctx;
  const tz = loc.tz;
  const n0 = d.next30[0];
  const isPlace = loc.kind === 'place';
  const name = loc.name;
  const where = isPlace ? `${name} (${loc.area})` : (loc.region ? `${name}, ${loc.region}` : `${name}, ${loc.countryName}`);
  const year = d.today.slice(0, 4);
  const mw = mwSeasonInfo(d);
  const nextNew = d.newMoons.find(t => t > Date.parse(d.today + 'T00:00:00Z'));
  const best = d.lunations[0] && d.lunations[0].best;

  const title = isPlace
    ? `${name}: ver estrellas y la Vía Láctea esta noche (${year})`
    : `Cielo nocturno en ${name}${loc.country !== 'ES' ? ', ' + loc.countryName : ''}: ¿a qué hora anochece y cuándo ver estrellas? (${year})`;
  const description = isPlace
    ? `Ventana oscura de ${name} para esta noche y las próximas 30: horas sin Sol ni Luna, Vía Láctea, lluvias de estrellas y mejores fechas del año.`
    : `Hoy en ${name} anochece a las ${time(n0.civil, tz)} y la noche cerrada empieza a las ${time(n0.astro, tz)}. Horas sin Luna, Vía Láctea, lluvias de estrellas y eclipses.`;

  const crumbItems = isPlace
    ? [['', 'Inicio'], ['lugares/', 'Lugares oscuros'], [loc.path, name]]
    : [['', 'Inicio'], [loc.countrySlug + '/', loc.countryName], [loc.path, name]];
  const cr = crumbs(ctx, crumbItems);

  const faqs = [];
  if (!isPlace) faqs.push({ q: `¿A qué hora anochece hoy en ${name}?`, a: `El ${longDateY(d.today)} el Sol se pone en ${name} a las ${time(n0.sunset, tz)}. El crepúsculo civil termina a las ${time(n0.civil, tz)} (cuando ya hace falta luz artificial) y la noche cerrada, con el Sol 18° bajo el horizonte, empieza a las ${n0.astro ? time(n0.astro, tz) : '—'}.` });
  if (nextNew) faqs.push({ q: `¿Cuándo es la próxima luna nueva?`, a: `La próxima luna nueva es el ${dateOfMs(nextNew, tz, true)} a las ${time(nextNew, tz)} (hora local de ${name}). Las noches de alrededor son las más oscuras del mes.` });
  if (best) faqs.push({ q: `¿Cuál es la mejor noche de este mes para ver estrellas en ${name}?`, a: `La mejor noche cercana es el ${longDateY(best.date)}, con ${dur(best.darkMin)} de oscuridad real sin Luna${best.mwMin ? ` y ${dur(best.mwMin)} con el núcleo de la Vía Láctea sobre el horizonte` : ''}.${d.lunations[0].bestWeekend && d.lunations[0].bestWeekend.date !== best.date ? ` Si buscas fin de semana, la mejor opción es el ${longDate(d.lunations[0].bestWeekend.date)}.` : ''}` });
  if (mw) faqs.push({ q: `¿Cuándo se ve la Vía Láctea desde ${name}?`, a: `El núcleo de la Vía Láctea, su parte más brillante, se ve desde ${name} de ${monthName(mw.from)} a ${monthName(mw.to)}. El mejor mes es ${monthName(mw.best.m)}, con hasta ${dur(mw.best.mwMin)} por noche sin Luna. Desde aquí llega a unos ${mw.gcMax}° de altura sobre el horizonte sur, así que necesitas un horizonte sur despejado.` });
  if (extra.nearPlaces && extra.nearPlaces.length) {
    const p = extra.nearPlaces[0];
    faqs.push({ q: `¿Dónde ver estrellas cerca de ${name}?`, a: `El lugar de cielo oscuro de nuestra lista más cercano es ${p.x.name} (${p.x.area}), a unos ${Math.round(p.km)} km en línea recta. En general, alejarse 30–50 km de núcleos urbanos grandes y buscar altura mejora muchísimo el cielo.` });
  }
  const faq = faqBlock(faqs);

  const solarHTML = d.solar.length ? `<ul class="events">${d.solar.map(e => `<li>${solarSentence(e, tz, name)}${extra.eclipsePages && extra.eclipsePages[e.dateKey] ? ` <a href="${L(extra.eclipsePages[e.dateKey])}">Ver todas las ciudades →</a>` : ''}</li>`).join('')}</ul>` : `<p>No hay eclipses de Sol apreciables desde ${esc(name)} en los próximos años.</p>`;
  const lunarHTML = d.lunar.length ? `<ul class="events">${d.lunar.map(e => `<li>${lunarSentence(e, tz)}</li>`).join('')}</ul>` : '';

  const body = `${cr.html}
<article class="wrap loc" data-tz="${esc(tz)}">
<header class="loc-head">
<p class="kicker">${esc(isPlace ? loc.area : (loc.region || loc.countryName))}</p>
<h1>${isPlace ? `Cielo nocturno en ${esc(name)}` : `${esc(name)}: ¿cuándo es de noche de verdad?`}</h1>
<p class="intro">${isPlace ? esc(loc.blurb) + ' ' : ''}Calculamos para ${esc(where)} las horas en las que no hay ni Sol ni Luna: la <a href="${L('como-funciona/')}">ventana oscura</a>. Es el momento de ver la Vía Láctea, las lluvias de estrellas o hacer astrofotografía.</p>
</header>

<section class="card tonight" id="esta-noche" aria-live="polite">${VO.tonight(n0, tz, { dateKey: n0.date })}</section>

<section class="card" id="proximas-noches"><h2>Las próximas 30 noches</h2>
<p class="muted">Altura de cada barra: horas de oscuridad real. El punto de arriba es la Luna (más brillante, más llena). Los fines de semana van resaltados.</p>
<div id="strip" class="scrollx">${VO.strip(d.next30)}</div></section>

${adSlot('loc-1')}

<section class="card" id="mejores-noches"><h2>Mejores noches para ver estrellas en ${esc(name)} (próximos 12 meses)</h2>
<p class="muted">Para cada luna nueva, la noche con más oscuridad real y la mejor opción en viernes o sábado.</p>
${lunationTable(d, tz)}</section>

<section class="card" id="via-lactea"><h2>Temporada de la Vía Láctea en ${esc(name)}</h2>
${mw ? `<p>El núcleo galáctico se puede ver de <strong>${monthName(mw.from)} a ${monthName(mw.to)}</strong>. En ${monthName(mw.best.m)} está visible hasta <strong>${dur(mw.best.mwMin)}</strong> por noche (sin contar la Luna) y sube a unos ${mw.gcMax}° sobre el horizonte sur.</p>` : `<p>Desde ${esc(name)} el núcleo de la Vía Láctea apenas asoma sobre el horizonte durante la noche cerrada.</p>`}
<div class="scrollx">${mwSeasonChart(d)}</div></section>

<section class="card" id="anochecer"><h2>¿A qué hora anochece en ${esc(name)}? Tabla por meses</h2>
<p class="muted">Horas locales de ${esc(name)}, con cambio de horario incluido.</p>
${twilightTableHTML(d, tz)}</section>

${adSlot('loc-2')}

<section class="card" id="lluvias"><h2>Lluvias de estrellas desde ${esc(name)}</h2>${showersTable(d, ctx)}</section>

<section class="card" id="eclipses"><h2>Eclipses visibles desde ${esc(name)}</h2>
<h3>De Sol</h3>${solarHTML}
${lunarHTML ? `<h3>De Luna</h3>${lunarHTML}` : ''}
<p class="fine">Nunca mires el Sol directamente sin filtro homologado ISO 12312-2, ni siquiera durante un eclipse parcial.</p></section>

${extra.nearPlaces && extra.nearPlaces.length ? `<section class="card" id="donde"><h2>Dónde ver estrellas cerca de ${esc(name)}</h2><ul class="links-grid">${extra.nearPlaces.map(p => `<li><a href="${L(p.x.path)}">${esc(p.x.name)}</a><span>${esc(p.x.area)} · ${Math.round(p.km)} km</span></li>`).join('')}</ul></section>` : ''}

${gearBlock()}
${faq.html}

${extra.nearCities && extra.nearCities.length ? `<section class="card" id="cerca"><h2>Ciudades cercanas</h2><ul class="links-grid">${extra.nearCities.map(c => `<li><a href="${L(c.x.path)}">${esc(c.x.name)}</a><span>${Math.round(c.km)} km</span></li>`).join('')}</ul></section>` : ''}
<p class="updated">Datos calculados el ${esc(longDateY(d.today))}. La sección «Esta noche» y las próximas 30 noches se recalculan en tu navegador cada vez que abres la página.</p>
</article>`;

  const placeLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: abs(loc.path), inLanguage: 'es',
    about: { '@type': 'Place', name, geo: { '@type': 'GeoCoordinates', latitude: loc.lat, longitude: loc.lon } } };

  return layout(ctx, { title, description, body, jsonld: [placeLd, cr.ld, faq.ld], pageData: { kind: 'loc', lat: loc.lat, lon: loc.lon, tz, name } });
}

module.exports = { layout, makeLinker, locationPage, crumbs, faqBlock, adSlot, gearBlock, abs, solarSentence, lunarSentence, showerRating, ECL_KIND, mwSeasonInfo };
