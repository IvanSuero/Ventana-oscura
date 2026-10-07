/* Ventana Oscura — recalcula en el navegador y buscador de ciudades. Sin dependencias ni cookies. */
(function () {
  var ASSETS = (document.currentScript && document.currentScript.src || '').replace(/app\.js(\?.*)?$/, '');
  var page = window.VO_PAGE;
  if (!page || !window.Astronomy || !window.makeSky || !window.VO) return;
  var S = window.makeSky(window.Astronomy);

  function ymdIn(date, tz) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(date);
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24 };
  }
  function add(ymd, n) { var t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function key(ymd) { return ymd.y + '-' + String(ymd.m).padStart(2, '0') + '-' + String(ymd.d).padStart(2, '0'); }
  function ms(x) { return x ? x.getTime() : null; }
  function run(lat, lon, ymd) {
    var n = S.night(lat, lon, ymd.y, ymd.m, ymd.d);
    return {
      date: key(ymd), dow: new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay(),
      darkMin: n.darkMin, mwMin: n.mwMin, score: n.score, moonFrac: n.moonFrac, moonPhase: n.moonPhase, moonName: n.moonName, astroNight: n.astroNight,
      sunset: ms(n.sunset), goldenStart: ms(n.goldenStart), civil: ms(n.civil), nautical: ms(n.nautical), astro: ms(n.astro),
      astroDawn: ms(n.astroDawn), nauticalDawn: ms(n.nauticalDawn), civilDawn: ms(n.civilDawn), sunrise: ms(n.sunrise),
      moonrise: ms(n.moonrise), moonset: ms(n.moonset), gcMaxAlt: n.gcMaxAlt,
      windows: n.windows.map(function (w) { return [ms(w.start), ms(w.end)]; }),
      mwWindows: n.mwWindows.map(function (w) { return [ms(w.start), ms(w.end)]; })
    };
  }
  // "Esta noche": antes de las 6:00 seguimos en la noche que empezó ayer
  function tonightYmd(tz) { var t = ymdIn(new Date(), tz); var b = { y: t.y, m: t.m, d: t.d }; return t.h < 6 ? add(b, -1) : b; }

  function render(lat, lon, tz, withStrip) {
    var start = tonightYmd(tz);
    var n0 = run(lat, lon, start);
    var box = document.getElementById('esta-noche');
    if (box) {
      var kick = box.querySelector('#live-where');
      box.innerHTML = (kick ? kick.outerHTML : '') + window.VO.tonight(n0, tz, { dateKey: n0.date });
      centerBar(box);
    }
    var strip = document.getElementById('strip');
    if (withStrip && strip) {
      setTimeout(function () {
        var list = [n0];
        for (var i = 1; i < 30; i++) list.push(run(lat, lon, add(start, i)));
        strip.innerHTML = window.VO.strip(list);
      }, 30);
    }
  }

  // En móvil la barra de la noche es más ancha que la pantalla: centramos en la madrugada
  function centerBar(scope) {
    var sc = (scope || document).querySelector('.scrollx'); if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
  }

  function boot() {
    try { render(page.lat, page.lon, page.tz, page.kind === 'loc'); } catch (e) { /* el contenido estático sigue valiendo */ }
    if (page.kind === 'home') initFinder();
  }

  // ---------- Buscador ----------
  var index = null;
  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function loadIndex(cb) {
    if (index) return cb(index);
    fetch(ASSETS + 'places.json').then(function (r) { return r.json(); }).then(function (j) {
      index = j.map(function (r) { return { n: r[0], s: r[1], u: r[2], lat: r[3], lon: r[4], k: norm(r[0]) }; });
      cb(index);
    });
  }
  function initFinder() {
    var q = document.getElementById('q'), res = document.getElementById('results'), geo = document.getElementById('geo');
    if (!q) return;
    var active = -1, items = [];
    function show(list) {
      items = list; active = -1;
      res.innerHTML = list.map(function (r, i) { return '<li><a href="' + r.u + '" data-i="' + i + '">' + window.VO.esc(r.n) + '<span>' + window.VO.esc(r.s) + '</span></a></li>'; }).join('');
      res.hidden = !list.length;
    }
    q.addEventListener('focus', function () { loadIndex(function () {}); });
    q.addEventListener('input', function () {
      var v = norm(q.value.trim());
      if (v.length < 2) return show([]);
      loadIndex(function (ix) {
        var pre = [], inc = [];
        for (var i = 0; i < ix.length && pre.length < 12; i++) {
          if (ix[i].k.indexOf(v) === 0) pre.push(ix[i]); else if (inc.length < 12 && ix[i].k.indexOf(v) > 0) inc.push(ix[i]);
        }
        show(pre.concat(inc).slice(0, 10));
      });
    });
    q.addEventListener('keydown', function (e) {
      var links = res.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!links.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach(function (a, i) { a.classList.toggle('active', i === active); });
      } else if (e.key === 'Enter') {
        e.preventDefault(); var a = links[active >= 0 ? active : 0]; if (a) location.href = a.href;
      } else if (e.key === 'Escape') { show([]); }
    });
    document.addEventListener('click', function (e) { if (!res.contains(e.target) && e.target !== q) res.hidden = true; });
    if (geo) geo.addEventListener('click', function () {
      if (!navigator.geolocation) return;
      geo.disabled = true; geo.lastChild.textContent = ' Calculando…';
      navigator.geolocation.getCurrentPosition(function (p) {
        var lat = p.coords.latitude, lon = p.coords.longitude;
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        render(lat, lon, tz, false);
        var where = document.getElementById('live-where');
        loadIndex(function (ix) {
          var best = null, bd = 1e9;
          ix.forEach(function (r) { var d = Math.pow(r.lat - lat, 2) + Math.pow((r.lon - lon) * Math.cos(lat * Math.PI / 180), 2); if (d < bd) { bd = d; best = r; } });
          if (where) where.innerHTML = 'Tu ubicación · ' + lat.toFixed(2) + ', ' + lon.toFixed(2) + (best ? ' · <a href="' + best.u + '">Ver ' + window.VO.esc(best.n) + ' →</a>' : '');
        });
        geo.disabled = false; geo.lastChild.textContent = ' Mi ubicación';
        document.getElementById('esta-noche').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, function () { geo.disabled = false; geo.lastChild.textContent = ' Sin permiso de ubicación'; }, { timeout: 10000, maximumAge: 600000 });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
