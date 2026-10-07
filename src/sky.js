/*
 * Ventana Oscura — motor de cálculo del cielo nocturno.
 * Funciona igual en Node (build) y en el navegador (cálculo en vivo).
 * Depende de astronomy-engine (Don Cross, MIT).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.makeSky = factory;
})(typeof self !== 'undefined' ? self : this, function makeSky(A) {
  const MIN = 60000;
  const STEP = 10 * MIN;
  // Centro galáctico (Sgr A*), J2000
  const GC_RA = 17 + 45 / 60 + 40 / 3600;
  const GC_DEC = -(29 + 0 / 60 + 28 / 3600);
  const GC_MIN_ALT = 10; // grados sobre el horizonte para que el núcleo se vea bien

  function observer(lat, lon, h) { return new A.Observer(lat, lon, h || 0); }

  // Mediodía solar aproximado (UTC) para la fecha local Y-M-D
  function solarNoon(y, m, d, lon) { return new Date(Date.UTC(y, m - 1, d, 12) - (lon / 15) * 3600000); }

  function t(x) { return x ? x.date : null; }

  function sunAltSearch(obs, dir, start, alt) {
    try { return t(A.SearchAltitude(A.Body.Sun, obs, dir, start, 1, alt)); } catch (e) { return null; }
  }
  function riseSet(body, obs, dir, start, days) {
    try { return t(A.SearchRiseSet(body, obs, dir, start, days || 1)); } catch (e) { return null; }
  }

  function moonAlt(obs, date) {
    const e = A.Equator(A.Body.Moon, date, obs, true, true);
    return A.Horizon(date, obs, e.ra, e.dec, 'normal').altitude;
  }
  function gcAlt(obs, date) { return A.Horizon(date, obs, GC_RA, GC_DEC, 'normal').altitude; }

  function moonInfo(date) {
    const ill = A.Illumination(A.Body.Moon, date);
    const phase = A.MoonPhase(date); // 0 nueva, 90 creciente, 180 llena, 270 menguante
    return { frac: ill.phase_fraction, phase };
  }

  function phaseName(phase) {
    if (phase < 10 || phase >= 350) return 'Luna nueva';
    if (phase < 80) return 'Creciente';
    if (phase < 100) return 'Cuarto creciente';
    if (phase < 170) return 'Gibosa creciente';
    if (phase < 190) return 'Luna llena';
    if (phase < 260) return 'Gibosa menguante';
    if (phase < 280) return 'Cuarto menguante';
    return 'Menguante';
  }

  /** Solo crepúsculos (rápido). */
  function twilight(lat, lon, y, m, d) {
    const obs = observer(lat, lon);
    const noon = solarNoon(y, m, d, lon);
    const sunset = riseSet(A.Body.Sun, obs, -1, noon);
    return {
      sunset,
      goldenStart: sunAltSearch(obs, -1, noon, 6),
      civil: sunAltSearch(obs, -1, noon, -6),
      nautical: sunAltSearch(obs, -1, noon, -12),
      astro: sunAltSearch(obs, -1, noon, -18),
      sunrise: sunset ? riseSet(A.Body.Sun, obs, +1, sunset) : null,
      astroDawn: sunset ? sunAltSearch(obs, +1, sunset, -18) : null,
      nauticalDawn: sunset ? sunAltSearch(obs, +1, sunset, -12) : null,
      civilDawn: sunset ? sunAltSearch(obs, +1, sunset, -6) : null,
      goldenEndMorning: sunset ? sunAltSearch(obs, +1, sunset, 6) : null,
    };
  }

  /**
   * Noche completa a partir de la tarde de la fecha local Y-M-D.
   * opts.moon=false ignora la Luna (para la temporada de la Vía Láctea).
   */
  function night(lat, lon, y, m, d, opts) {
    opts = opts || {};
    const useMoon = opts.moon !== false;
    const obs = observer(lat, lon);
    const tw = twilight(lat, lon, y, m, d);
    const res = Object.assign({}, tw, {
      astroNight: !!(tw.astro && tw.astroDawn && tw.astroDawn > tw.astro),
      darkMin: 0, mwMin: 0, windows: [], mwWindows: [], gcMaxAlt: -90,
      moonrise: null, moonset: null,
    });
    const mid = tw.sunset && tw.sunrise ? new Date((tw.sunset.getTime() + tw.sunrise.getTime()) / 2) : solarNoon(y, m, d + 1, lon);
    const mi = moonInfo(mid);
    res.moonFrac = mi.frac; res.moonPhase = mi.phase; res.moonName = phaseName(mi.phase);
    if (tw.sunset) {
      res.moonrise = riseSet(A.Body.Moon, obs, +1, tw.sunset, 0.75);
      res.moonset = riseSet(A.Body.Moon, obs, -1, tw.sunset, 0.75);
      if (res.moonrise && tw.sunrise && res.moonrise > tw.sunrise) res.moonrise = null;
      if (res.moonset && tw.sunrise && res.moonset > tw.sunrise) res.moonset = null;
    }
    if (!res.astroNight) { res.score = 0; return res; }

    const start = tw.astro.getTime(), end = tw.astroDawn.getTime();
    let cur = null, curMw = null;
    for (let ms = start; ms < end; ms += STEP) {
      const dt = new Date(ms);
      const moonUp = useMoon && mi.frac > 0.03 && moonAlt(obs, dt) > -0.5;
      const dark = !moonUp;
      let mw = false;
      if (dark) {
        res.darkMin += STEP / MIN;
        const g = gcAlt(obs, dt);
        if (g > res.gcMaxAlt) res.gcMaxAlt = g;
        if (g >= GC_MIN_ALT) { mw = true; res.mwMin += STEP / MIN; }
      }
      if (dark) { if (!cur) cur = { start: dt, end: dt }; cur.end = new Date(Math.min(ms + STEP, end)); }
      else if (cur) { res.windows.push(cur); cur = null; }
      if (mw) { if (!curMw) curMw = { start: dt, end: dt }; curMw.end = new Date(Math.min(ms + STEP, end)); }
      else if (curMw) { res.mwWindows.push(curMw); curMw = null; }
    }
    if (cur) res.windows.push(cur);
    if (curMw) res.mwWindows.push(curMw);
    res.gcMaxAlt = Math.round(res.gcMaxAlt);
    // Nota 0–10: horas de oscuridad real (hasta 7 h = 8 puntos) + bonus Vía Láctea (hasta 2)
    const darkPts = Math.min(res.darkMin / 60, 7) / 7 * 8;
    const mwPts = Math.min(res.mwMin / 60, 3) / 3 * 2;
    res.score = Math.round((darkPts + mwPts) * 10) / 10;
    return res;
  }

  /** Lunas nuevas y llenas entre dos fechas. */
  function lunarPhases(from, to) {
    const out = [];
    let q = A.SearchMoonQuarter(from);
    while (q.time.date < to) {
      out.push({ quarter: q.quarter, date: q.time.date });
      q = A.NextMoonQuarter(q);
    }
    return out;
  }

  return { night, twilight, lunarPhases, moonInfo, phaseName, GC_MIN_ALT };
});
