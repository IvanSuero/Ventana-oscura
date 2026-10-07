#!/usr/bin/env node
// Genera el sitio estático completo en dist/.
// Uso: node build.js [--limit N] [--relative] [--out dir]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (!isMainThread) {
  const { computeLocation } = require('./src/compute.js');
  const now = new Date(workerData.now);
  parentPort.on('message', loc => parentPort.postMessage({ path: loc.path, data: computeLocation(loc, now) }));
  return;
}

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LIMIT = +opt('--limit', 0);
const RELATIVE = args.includes('--relative');
const OUT = path.resolve(opt('--out', 'dist'));
const NOW = new Date(opt('--now', new Date().toISOString()));

const cfg = require('./site.config.js');
const { loadCities, PLACES, SHOWERS, COUNTRIES, nearest } = require('./src/data.js');
const R = require('./src/render.js');
const P = require('./src/pages.js');

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

async function computeAll(locs) {
  const cacheDir = path.join(__dirname, '.cache', NOW.toISOString().slice(0, 10));
  fs.mkdirSync(cacheDir, { recursive: true });
  const data = {};
  const todo = [];
  for (const l of locs) {
    const f = path.join(cacheDir, l.path.replace(/\//g, '_') + '.json');
    if (fs.existsSync(f)) data[l.path] = JSON.parse(fs.readFileSync(f, 'utf8'));
    else todo.push(l);
  }
  const nThreads = Math.max(1, Math.min(os.cpus().length, 8));
  console.log(`Calculando ${todo.length} ubicaciones (${locs.length - todo.length} en caché) con ${nThreads} hilos…`);
  let done = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: nThreads }, () => new Promise((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { now: NOW.toISOString() } });
    const next = () => { const l = todo.shift(); if (!l) { w.terminate(); resolve(); } else w.postMessage(l); };
    w.on('message', ({ path: p, data: d }) => {
      data[p] = d;
      fs.writeFileSync(path.join(cacheDir, p.replace(/\//g, '_') + '.json'), JSON.stringify(d));
      if (++done % 50 === 0) console.log(`  ${done} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      next();
    });
    w.on('error', reject);
    next();
  })));
  return data;
}

(async () => {
  const t0 = Date.now();
  let cities = loadCities();
  if (LIMIT) {
    // Demo: las N más pobladas + todas las de la provincia de Tarragona/Cataluña grandes
    const keep = new Set(cities.slice(0, LIMIT).map(c => c.path));
    cities = cities.filter(c => keep.has(c.path) || (c.region === 'Cataluña' && c.pop > 40000));
  }
  const places = PLACES;
  const locs = [...cities, ...places];
  const data = await computeAll(locs);
  const today = data[cities[0].path].today;

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = p => ({ path: p, L: R.makeLinker(p, RELATIVE) });
  const pages = [];
  const page = (p, html) => { write(p + (p === '' || p.endsWith('/') ? 'index.html' : ''), html); if (!p.endsWith('.html')) pages.push(p); };

  const eclipses = P.collectEclipses(cities, data).filter(e => Date.parse(e.key) < NOW.getTime() + 6 * 365.25 * 864e5);
  const eclipsePaths = Object.fromEntries(eclipses.map(e => [e.key, e.path]));

  for (const c of cities) {
    const nearCities = nearest(c, cities.filter(x => x.country === c.country), 10);
    const nearPlaces = c.country === 'ES' ? nearest(c, places, 4, 450) : [];
    page(c.path, R.locationPage(ctx(c.path), c, data[c.path], { nearCities, nearPlaces, eclipsePages: eclipsePaths }));
  }
  for (const p of places) {
    const nearCities = nearest(p, cities.filter(x => x.country === 'ES'), 8);
    const nearPlaces = nearest(p, places, 3);
    page(p.path, R.locationPage(ctx(p.path), p, data[p.path], { nearCities, nearPlaces, eclipsePages: eclipsePaths }));
  }
  page('', P.home(ctx(''), { cities, places, data, eclipsePages: eclipses, today }));
  for (const code of Object.keys(COUNTRIES)) if (cities.some(c => c.country === code)) page(COUNTRIES[code].slug + '/', P.countryPage(ctx(COUNTRIES[code].slug + '/'), code, cities));
  page('ciudades/', P.countriesIndex(ctx('ciudades/'), cities));
  page('lugares/', P.placesIndex(ctx('lugares/'), places, data));
  page('lluvias-de-estrellas/', P.showersHub(ctx('lluvias-de-estrellas/'), today));
  for (const s of SHOWERS) page(`lluvias-de-estrellas/${s.slug}/`, P.showerPage(ctx(`lluvias-de-estrellas/${s.slug}/`), s, cities, data, today));
  page('eclipses/', P.eclipsesHub(ctx('eclipses/'), eclipses, today));
  for (const e of eclipses) page(e.path, P.eclipsePage(ctx(e.path), e));
  page('calendario-lunar/', P.lunarCalendar(ctx('calendario-lunar/'), today));
  page('como-funciona/', P.howItWorks(ctx('como-funciona/')));
  page('aviso-legal/', P.legal(ctx('aviso-legal/')));
  page('privacidad/', P.privacy(ctx('privacidad/')));
  write('404.html', P.notFound({ path: '404.html', L: R.makeLinker('', RELATIVE) }));

  // Recursos estáticos
  const assets = path.join(OUT, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  for (const f of ['style.css', 'app.js', 'favicon.svg']) fs.copyFileSync(path.join(__dirname, 'public', f), path.join(assets, f));
  fs.copyFileSync(path.join(__dirname, 'src/sky.js'), path.join(assets, 'sky.js'));
  fs.copyFileSync(path.join(__dirname, 'src/viz.js'), path.join(assets, 'viz.js'));
  fs.copyFileSync(path.join(__dirname, 'node_modules/astronomy-engine/astronomy.browser.min.js'), path.join(assets, 'astronomy.browser.min.js'));
  // Índice de búsqueda: [nombre, subtítulo, ruta, lat, lon]
  const L0 = R.makeLinker('', RELATIVE);
  const index = [...cities.map(c => [c.name, c.region ? `${c.region}, ${c.countryName}` : c.countryName, L0(c.path), c.lat, c.lon]),
    ...places.map(p => [p.name, p.area, L0(p.path), p.lat, p.lon])];
  fs.writeFileSync(path.join(assets, 'places.json'), JSON.stringify(index));

  // SEO técnico
  const lastmod = today;
  const prio = p => (p === '' ? '1.0' : p.split('/').length <= 2 ? '0.8' : '0.6');
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `<url><loc>${R.abs(p)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${prio(p)}</priority></url>`).join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${R.abs('sitemap.xml')}\n`);
  if (process.env.CNAME) write('CNAME', process.env.CNAME + '\n');
  if (cfg.adsenseClient) write('ads.txt', `google.com, ${cfg.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);

  console.log(`Listo: ${pages.length} páginas en ${path.relative(process.cwd(), OUT)}/ en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})().catch(e => { console.error(e); process.exit(1); });
