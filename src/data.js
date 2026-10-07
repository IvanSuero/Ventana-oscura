// Datos de ubicaciones: ciudades (GeoNames vía all-the-cities), lugares de cielo oscuro y lluvias de estrellas.
const allCities = require('all-the-cities');
const { find: findTz } = require('geo-tz');

const COUNTRIES = {
  ES: { name: 'España', slug: 'espana', minPop: 15000 },
  MX: { name: 'México', slug: 'mexico', minPop: 200000 },
  AR: { name: 'Argentina', slug: 'argentina', minPop: 150000 },
  CO: { name: 'Colombia', slug: 'colombia', minPop: 200000 },
  CL: { name: 'Chile', slug: 'chile', minPop: 150000 },
  PE: { name: 'Perú', slug: 'peru', minPop: 200000 },
  VE: { name: 'Venezuela', slug: 'venezuela', minPop: 250000 },
  EC: { name: 'Ecuador', slug: 'ecuador', minPop: 200000 },
  GT: { name: 'Guatemala', slug: 'guatemala', minPop: 200000 },
  CU: { name: 'Cuba', slug: 'cuba', minPop: 200000 },
  BO: { name: 'Bolivia', slug: 'bolivia', minPop: 200000 },
  DO: { name: 'República Dominicana', slug: 'republica-dominicana', minPop: 200000 },
  HN: { name: 'Honduras', slug: 'honduras', minPop: 200000 },
  PY: { name: 'Paraguay', slug: 'paraguay', minPop: 150000 },
  SV: { name: 'El Salvador', slug: 'el-salvador', minPop: 150000 },
  NI: { name: 'Nicaragua', slug: 'nicaragua', minPop: 150000 },
  CR: { name: 'Costa Rica', slug: 'costa-rica', minPop: 100000 },
  PA: { name: 'Panamá', slug: 'panama', minPop: 150000 },
  UY: { name: 'Uruguay', slug: 'uruguay', minPop: 100000 },
  PR: { name: 'Puerto Rico', slug: 'puerto-rico', minPop: 100000 },
};

const ES_REGIONS = {
  '51': 'Andalucía', '52': 'Aragón', '34': 'Asturias', '07': 'Islas Baleares', '53': 'Canarias',
  '39': 'Cantabria', '55': 'Castilla y León', '54': 'Castilla-La Mancha', '56': 'Cataluña',
  '60': 'Comunidad Valenciana', '57': 'Extremadura', '58': 'Galicia', '29': 'Comunidad de Madrid',
  '31': 'Región de Murcia', '32': 'Navarra', '59': 'País Vasco', '27': 'La Rioja', 'CE': 'Ceuta', 'ML': 'Melilla',
};

// Nombres en español donde GeoNames usa el inglés
const NAME_FIX = {
  'Mexico City': 'Ciudad de México', 'Havana': 'La Habana', 'Guatemala City': 'Ciudad de Guatemala',
  'Ciudad Nezahualcoyotl': 'Ciudad Nezahualcóyotl', 'Cadiz': 'Cádiz', 'Donostia / San Sebastián': 'Donostia-San Sebastián', 'Palma': 'Palma de Mallorca', 'Tuxtla': 'Tuxtla Gutiérrez', 'Panama City': 'Ciudad de Panamá',
};
// Alcaldías/distritos dentro de una gran ciudad: mismo cielo que la ciudad principal → no aportan página propia
const EXCLUDE = new Set(['MX:Iztapalapa', 'MX:Gustavo Adolfo Madero', 'MX:Coyoacán', 'MX:Tlalpan', 'MX:Azcapotzalco', 'MX:Xochimilco',
  'MX:Iztacalco', 'MX:Miguel Hidalgo', 'MX:Benito Juarez', 'MX:Cuauhtémoc', 'MX:Tláhuac', 'MX:Magdalena Contreras', 'MX:Alvaro Obregon',
  'MX:Venustiano Carranza', 'DO:Santo Domingo Oeste', 'DO:Santo Domingo Este', 'ES:Chamartín', 'ES:Campiña', 'ES:Grao de Murviedro', 'ES:Sant Andreu', 'ES:Nou Barris', 'ES:Horta-Guinardó', 'ES:Sants-Montjuïc', 'ES:Sarrià-Sant Gervasi', 'ES:Les Corts', 'ES:Gràcia', 'ES:Eixample']);

function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function haversine(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function loadCities(limit) {
  const out = [];
  const seen = new Set();
  const list = allCities
    .filter(c => COUNTRIES[c.country] && !String(c.featureCode).startsWith('PPLX'))
    .filter(c => c.population >= COUNTRIES[c.country].minPop ||
      (c.country === 'ES' && ['PPLA', 'PPLA2', 'PPLC'].includes(c.featureCode) && c.population >= 5000))
    .sort((a, b) => b.population - a.population);
  for (const raw of list) {
    if (EXCLUDE.has(raw.country + ':' + raw.name)) continue;
    const c = NAME_FIX[raw.name] ? { ...raw, name: NAME_FIX[raw.name] } : raw;
    const country = COUNTRIES[c.country];
    let slug = slugify(c.name);
    if (!slug) continue;
    const key = country.slug + '/' + slug;
    if (seen.has(key)) {
      // Homónimos: añadimos la región/código para desambiguar (la más poblada se queda el nombre limpio)
      const reg = c.country === 'ES' ? ES_REGIONS[c.adminCode] : c.adminCode;
      slug = slug + '-' + slugify(String(reg || c.cityId));
      if (seen.has(country.slug + '/' + slug)) continue;
    }
    seen.add(country.slug + '/' + slug);
    const [lon, lat] = c.loc.coordinates;
    out.push({
      id: c.cityId, name: c.name, country: c.country, countryName: country.name, countrySlug: country.slug,
      region: c.country === 'ES' ? (ES_REGIONS[c.adminCode] || '') : '',
      slug, path: `${country.slug}/${slug}/`, lat: +lat.toFixed(4), lon: +lon.toFixed(4),
      pop: c.population, tz: findTz(lat, lon)[0], kind: 'city',
    });
    if (limit && out.length >= limit) break;
  }
  // Distritos y barrios (Sant Martí, Ciudad Lineal…): a menos de 5,5 km de una ciudad 5 veces mayor → mismo cielo, fuera
  return out.filter(c => !out.some(big => big !== c && big.country === c.country && big.pop >= c.pop * 5 && haversine(c, big) < 5.5));
}

// Lugares de cielo oscuro en España (coordenadas aproximadas del área)
const PLACES = [
  { slug: 'montsec', name: 'Montsec', area: 'Lleida, Cataluña', lat: 42.05, lon: 0.74,
    blurb: 'La sierra del Montsec, con el Parc Astronòmic Montsec en Àger, es uno de los cielos más protegidos de Cataluña y tiene la certificación Starlight.' },
  { slug: 'serra-de-prades', name: 'Serra de Prades y Siurana', area: 'Tarragona, Cataluña', lat: 41.31, lon: 0.98,
    blurb: 'Zona de montaña a menos de una hora de Tarragona y Reus, con pueblos pequeños y mucha menos contaminación lumínica que la costa.' },
  { slug: 'teide', name: 'Parque Nacional del Teide', area: 'Tenerife, Canarias', lat: 28.27, lon: -16.64,
    blurb: 'Por encima del mar de nubes y junto al Observatorio del Teide, ofrece uno de los cielos más limpios de Europa.' },
  { slug: 'roque-de-los-muchachos', name: 'Roque de los Muchachos', area: 'La Palma, Canarias', lat: 28.76, lon: -17.88,
    blurb: 'Sede de uno de los observatorios más importantes del mundo. La Palma protege su cielo por ley desde 1988.' },
  { slug: 'fuerteventura', name: 'Fuerteventura', area: 'Canarias', lat: 28.36, lon: -14.05,
    blurb: 'La isla entera es reserva Starlight: interior llano, poca población y horizontes despejados.' },
  { slug: 'sierra-morena', name: 'Sierra Morena', area: 'Jaén y Córdoba, Andalucía', lat: 38.25, lon: -4.05,
    blurb: 'Gran extensión de sierra poco poblada, certificada como reserva Starlight, entre las provincias de Jaén, Córdoba y Sevilla.' },
  { slug: 'sierra-sur-de-jaen', name: 'Sierra Sur de Jaén', area: 'Jaén, Andalucía', lat: 37.6, lon: -3.9,
    blurb: 'Comarca de olivar y montaña con cielos muy oscuros y certificación Starlight.' },
  { slug: 'calar-alto', name: 'Calar Alto', area: 'Almería, Andalucía', lat: 37.22, lon: -2.55,
    blurb: 'En la Sierra de los Filabres, junto al mayor observatorio astronómico de Europa continental.' },
  { slug: 'sierra-nevada', name: 'Sierra Nevada', area: 'Granada, Andalucía', lat: 37.06, lon: -3.38,
    blurb: 'La altitud deja atrás la contaminación de Granada y la neblina; aquí se encuentra el Observatorio de Sierra Nevada.' },
  { slug: 'gudar-javalambre', name: 'Gúdar-Javalambre', area: 'Teruel, Aragón', lat: 40.08, lon: -1.0,
    blurb: 'Una de las zonas más despobladas de Europa occidental, con el Observatorio Astrofísico de Javalambre.' },
  { slug: 'albarracin', name: 'Sierra de Albarracín', area: 'Teruel, Aragón', lat: 40.41, lon: -1.44,
    blurb: 'Altitud, baja densidad de población y un pueblo medieval como telón de fondo para la astrofotografía.' },
  { slug: 'monfrague', name: 'Monfragüe', area: 'Cáceres, Extremadura', lat: 39.83, lon: -6.03,
    blurb: 'El parque nacional y su entorno son destino Starlight, con dehesa abierta y horizontes amplios.' },
  { slug: 'sierra-de-gredos', name: 'Sierra de Gredos', area: 'Ávila, Castilla y León', lat: 40.27, lon: -5.25,
    blurb: 'La escapada de cielo oscuro más cercana para quien vive en Madrid, con altitud y valles poco iluminados.' },
].map(p => ({ ...p, path: `lugares/${p.slug}/`, tz: findTz(p.lat, p.lon)[0], kind: 'place', country: 'ES', countryName: 'España' }));

// Lluvias de estrellas: noche del pico (mes, día de la tarde en que empieza la noche), THZ aproximada
const SHOWERS = [
  { slug: 'cuadrantidas', name: 'Cuadrántidas', m: 1, d: 3, zhr: 110, note: 'Pico corto, mejor de madrugada. Radiante en el norte: muy pobres desde el hemisferio sur.' },
  { slug: 'liridas', name: 'Líridas', m: 4, d: 22, zhr: 18, note: 'Lluvia modesta pero con bólidos ocasionales. Mejor antes del amanecer.' },
  { slug: 'eta-acuaridas', name: 'Eta Acuáridas', m: 5, d: 5, zhr: 50, note: 'Restos del cometa Halley. Mucho mejores desde latitudes tropicales y del sur; en España, solo la última hora antes del alba.' },
  { slug: 'delta-acuaridas', name: 'Delta Acuáridas', m: 7, d: 29, zhr: 25, note: 'Se solapan con el inicio de las Perseidas. Mejor desde el sur de España y Latinoamérica.' },
  { slug: 'perseidas', name: 'Perseidas', m: 8, d: 12, zhr: 100, note: 'Las «Lágrimas de San Lorenzo». Noches cálidas y actividad alta: la lluvia más popular del año en el hemisferio norte.' },
  { slug: 'draconidas', name: 'Dracónidas', m: 10, d: 8, zhr: 10, note: 'A diferencia de casi todas, son mejores al anochecer. Normalmente flojas, con estallidos ocasionales.' },
  { slug: 'orionidas', name: 'Oriónidas', m: 10, d: 21, zhr: 20, note: 'También del cometa Halley. Meteoros rápidos, mejor en la segunda mitad de la noche.' },
  { slug: 'leonidas', name: 'Leónidas', m: 11, d: 17, zhr: 15, note: 'Famosas por sus tormentas históricas; hoy suelen ser modestas. Mejor de madrugada.' },
  { slug: 'geminidas', name: 'Gemínidas', m: 12, d: 13, zhr: 150, note: 'La lluvia más intensa y fiable del año. El radiante sube pronto, así que se ven desde media noche.' },
  { slug: 'ursidas', name: 'Úrsidas', m: 12, d: 22, zhr: 10, note: 'Pequeña lluvia del solsticio de invierno, solo para el hemisferio norte.' },
];

function nearest(target, list, n, maxKm) {
  return list.filter(x => x !== target)
    .map(x => ({ x, km: haversine(target, x) }))
    .filter(o => !maxKm || o.km <= maxKm)
    .sort((a, b) => a.km - b.km).slice(0, n);
}

module.exports = { COUNTRIES, ES_REGIONS, PLACES, SHOWERS, loadCities, slugify, haversine, nearest };
