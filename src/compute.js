// Calcula todos los datos de cielo para una ubicación a partir de la fecha de build.
const A = require('astronomy-engine');
const sky = require('./sky.js')(A);
const { SHOWERS } = require('./data.js');

function ymdIn(date, tz) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const [y, m, d] = p.split('-').map(Number);
  return { y, m, d };
}
function addDays({ y, m, d }, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
function ymdKey({ y, m, d }) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function dow({ y, m, d }) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

const ms = x => (x ? x.getTime() : null);
function slim(n, full) {
  const o = {
    darkMin: n.darkMin, mwMin: n.mwMin, score: n.score, moonFrac: +n.moonFrac.toFixed(3),
    moonPhase: Math.round(n.moonPhase), moonName: n.moonName, astroNight: n.astroNight,
  };
  if (full) Object.assign(o, {
    sunset: ms(n.sunset), goldenStart: ms(n.goldenStart), civil: ms(n.civil), nautical: ms(n.nautical),
    astro: ms(n.astro), astroDawn: ms(n.astroDawn), nauticalDawn: ms(n.nauticalDawn), civilDawn: ms(n.civilDawn), sunrise: ms(n.sunrise), moonrise: ms(n.moonrise), moonset: ms(n.moonset),
    gcMaxAlt: n.gcMaxAlt,
    windows: n.windows.map(w => [ms(w.start), ms(w.end)]),
    mwWindows: n.mwWindows.map(w => [ms(w.start), ms(w.end)]),
  });
  return o;
}

function computeLocation(loc, now) {
  const { lat, lon, tz } = loc;
  let today = ymdIn(now, tz);
  const night = (ymd, opts) => sky.night(lat, lon, ymd.y, ymd.m, ymd.d, opts);

  // Próximas 30 noches
  const next30 = [];
  for (let i = 0; i < 30; i++) {
    const ymd = addDays(today, i);
    next30.push({ date: ymdKey(ymd), dow: dow(ymd), ...slim(night(ymd), i < 2) });
  }

  // Mejores noches por lunación (12 meses): ±3 noches alrededor de cada luna nueva
  const phases = sky.lunarPhases(new Date(now.getTime() - 3 * 864e5), new Date(now.getTime() + 372 * 864e5));
  const lunations = [];
  for (const q of phases.filter(p => p.quarter === 0)) {
    const nm = ymdIn(q.date, tz);
    let best = null, bestWeekend = null;
    for (let k = -3; k <= 3; k++) {
      const ymd = addDays(nm, k);
      if (ymdKey(ymd) < ymdKey(today)) continue;
      const n = slim(night(ymd), true);
      const row = { date: ymdKey(ymd), dow: dow(ymd), ...n };
      if (!best || row.score > best.score) best = row;
      if ((row.dow === 5 || row.dow === 6) && (!bestWeekend || row.score > bestWeekend.score)) bestWeekend = row;
    }
    if (best) lunations.push({ newMoon: q.date.getTime(), best, bestWeekend });
  }
  const fullMoons = phases.filter(p => p.quarter === 2).map(p => p.date.getTime());
  const newMoons = phases.filter(p => p.quarter === 0).map(p => p.date.getTime());

  // Anochecer por meses (día 1 y 15) para el año en curso y lo que queda del siguiente
  const twilightTable = [];
  for (let i = 0; i < 12; i++) {
    const mm = ((today.m - 1 + i) % 12) + 1;
    const yy = today.y + Math.floor((today.m - 1 + i) / 12);
    for (const dd of [1, 15]) {
      const tw = sky.twilight(lat, lon, yy, mm, dd);
      twilightTable.push({
        date: ymdKey({ y: yy, m: mm, d: dd }),
        sunset: ms(tw.sunset), civil: ms(tw.civil), astro: ms(tw.astro), sunrise: ms(tw.sunrise),
        goldenStart: ms(tw.goldenStart),
      });
    }
  }

  // Temporada de la Vía Láctea (sin Luna): minutos visibles el día 15 de cada mes
  const mwSeason = [];
  for (let mm = 1; mm <= 12; mm++) {
    const n = night({ y: today.y, m: mm, d: 15 }, { moon: false });
    mwSeason.push({ m: mm, mwMin: n.mwMin, gcMaxAlt: n.gcMaxAlt, start: n.mwWindows[0] ? ms(n.mwWindows[0].start) : null });
  }

  // Lluvias de estrellas: próximas 10 noches de pico
  const showers = [];
  for (let yy = today.y; yy <= today.y + 1; yy++) {
    for (const s of SHOWERS) {
      const ymd = { y: yy, m: s.m, d: s.d };
      if (ymdKey(ymd) < ymdKey(today)) continue;
      const n = slim(night(ymd), true);
      showers.push({ slug: s.slug, name: s.name, zhr: s.zhr, date: ymdKey(ymd), ...n });
    }
  }
  showers.sort((a, b) => a.date.localeCompare(b.date));

  // Eclipses de Sol visibles desde aquí (próximos ~12 años)
  const obs = new A.Observer(lat, lon, 0);
  const solar = [];
  let e = A.SearchLocalSolarEclipse(now, obs);
  const limit = now.getTime() + 12 * 365.25 * 864e5;
  while (e.peak.time.date.getTime() < limit && solar.length < 4) {
    const visible = e.peak.altitude > 0 || e.partial_begin.altitude > 0 || e.partial_end.altitude > 0;
    if (visible && e.obscuration >= 0.03) {
      solar.push({
        kind: e.kind, obscuration: +e.obscuration.toFixed(3), peak: ms(e.peak.time.date), peakAlt: +e.peak.altitude.toFixed(1),
        begin: ms(e.partial_begin.time.date), end: ms(e.partial_end.time.date),
        beginAlt: +e.partial_begin.altitude.toFixed(1), endAlt: +e.partial_end.altitude.toFixed(1),
        totalBegin: e.total_begin ? ms(e.total_begin.time.date) : null, totalEnd: e.total_end ? ms(e.total_end.time.date) : null,
      });
    }
    e = A.NextLocalSolarEclipse(e.peak.time, obs);
  }

  // Eclipses de Luna con la Luna sobre el horizonte en el máximo (próximos ~6 años, sin penumbrales)
  const lunar = [];
  let l = A.SearchLunarEclipse(now);
  const llimit = now.getTime() + 6 * 365.25 * 864e5;
  while (l.peak.date.getTime() < llimit && lunar.length < 4) {
    if (l.kind !== 'penumbral') {
      const eq = A.Equator(A.Body.Moon, l.peak.date, obs, true, true);
      const alt = A.Horizon(l.peak.date, obs, eq.ra, eq.dec, 'normal').altitude;
      if (alt > 0) lunar.push({ kind: l.kind, peak: ms(l.peak.date), alt: Math.round(alt), sdTotal: l.sd_total, sdPartial: l.sd_partial });
    }
    l = A.NextLunarEclipse(l.peak);
  }

  return { today: ymdKey(today), next30, lunations, newMoons, fullMoons, twilightTable, mwSeason, showers, solar, lunar };
}

module.exports = { computeLocation, ymdIn, addDays, ymdKey };
