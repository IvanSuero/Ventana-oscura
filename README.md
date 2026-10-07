# Ventana Oscura

**Cuándo es de noche de verdad en tu ciudad.** Sitio web estático que calcula, para ~760 ciudades de España y Latinoamérica y 13 lugares de cielo oscuro, las horas sin Sol ni Luna (la «ventana oscura»), la temporada de la Vía Láctea, a qué hora anochece cada mes, las lluvias de estrellas y los eclipses.

- **Coste: 0 €.** Se aloja gratis en GitHub Pages (o Cloudflare Pages). Opcional: un dominio (~10 €/año).
- **Mantenimiento: ninguno.** No hay servidor, base de datos ni APIs externas. Todo es geometría celeste calculada con [Astronomy Engine](https://github.com/cosinekitty/astronomy). GitHub lo reconstruye solo cada lunes, y la parte de «Esta noche» se recalcula en el navegador de cada visitante.
- **Promoción: solo SEO.** ~900 páginas que responden búsquedas reales en español: «a qué hora anochece en Sevilla», «perseidas 2027», «eclipse 2 agosto 2027 Málaga», «ver la vía láctea Madrid», «calendario lunar 2027», «dónde ver estrellas cerca de Valencia»…

## Por qué puede funcionar

1. **Búsquedas recurrentes y estacionales.** Cada verano (Perseidas, Vía Láctea) y cada eclipse generan picos enormes de búsquedas en español.
2. **El eclipse total del 2 de agosto de 2027** cruza el sur de España, y el anular del 26 de enero de 2028 también pasa por la península. Son eventos que llevan meses de búsquedas («a qué hora es el eclipse en mi ciudad»). El sitio ya tiene una página por eclipse con hora y porcentaje en cada ciudad.
3. **Competencia débil en español en el formato concreto.** Hay webs de salida y puesta del Sol, pero casi ninguna cruza Sol + Luna + Vía Láctea en una respuesta clara para cada ciudad.
4. **Long tail programático**: cientos de ciudades × varias intenciones de búsqueda, cada página con datos únicos (no texto duplicado).

## Puesta en marcha (unos 15 minutos)

1. Crea una cuenta en GitHub (si no tienes) y un repositorio **público** llamado `ventana-oscura`.
2. Sube esta carpeta al repositorio (por ejemplo con GitHub Desktop, o `git init && git add . && git commit -m "Inicio" && git push`).
3. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. En **Settings → Secrets and variables → Actions → Variables**, crea:
   - Sin dominio propio: `SITE_URL` = `https://TU_USUARIO.github.io` y `BASE_PATH` = `/ventana-oscura/`
   - Con dominio propio: `SITE_URL` = `https://tudominio.com`, `BASE_PATH` = `/` y `CNAME` = `tudominio.com` (y apunta el DNS a GitHub Pages)
   - `CONTACT_EMAIL` con un correo de contacto.
5. Ve a **Actions → Construir y publicar → Run workflow**. En ~5 minutos el sitio estará publicado.
6. Da de alta el sitio en **Google Search Console** (gratis), verifica con la variable `GOOGLE_VERIFICATION` y envía `sitemap.xml`. Haz lo mismo en **Bing Webmaster Tools** (importa desde Search Console en un clic).

Antes de publicar, completa el titular en `src/pages.js` (función `legal`).

## Monetización (cuando haya tráfico)

| Fuente | Cuándo | Cómo activarla |
|---|---|---|
| Google AdSense | Con contenido indexado y algo de tráfico | Variable `ADSENSE_CLIENT` = `ca-pub-…`. Se añaden solos los huecos de anuncio y `ads.txt` |
| Amazon Afiliados | Desde el principio | Variable `AMAZON_TAG`. Aparece un bloque de material (prismáticos, linterna roja, trípode, planisferio) |
| Más adelante | Si el tráfico crece | Calendario imprimible de noches oscuras por ciudad (producto digital), patrocinio de casas rurales y alojamientos Starlight |

Expectativa realista: el SEO tarda 3–9 meses en arrancar. Los picos llegarán con las Perseidas y, sobre todo, con el eclipse de agosto de 2027.

## Desarrollo

```bash
npm install
npm run build      # sitio completo en dist/ (~5 min la primera vez; luego usa caché diaria en .cache/)
npm run demo       # 40 ciudades con enlaces relativos, para abrir sin servidor
npm run serve      # sirve dist/ en local
```

Estructura:

- `src/sky.js` — motor astronómico (crepúsculos, Luna, ventana oscura, Vía Láctea). Se usa igual en Node y en el navegador.
- `src/compute.js` — todos los datos de una ubicación (30 noches, 12 lunaciones, tabla de anochecer, temporada de Vía Láctea, lluvias, eclipses).
- `src/viz.js` — gráficos SVG y bloque «Esta noche» (compartido servidor/navegador).
- `src/render.js`, `src/pages.js` — plantillas HTML, datos estructurados (FAQ, migas), enlazado interno.
- `src/data.js` — ciudades (GeoNames), lugares oscuros y lluvias de estrellas.
- `public/` — CSS, JS del navegador y favicon.
- `site.config.js` — URL, monetización y contacto.

Ideas para crecer sin promoción: añadir más lugares Starlight, municipios más pequeños (bajando `minPop` en `src/data.js`), páginas «Vía Láctea en [mes] [año]» y portugués/inglés como segundo idioma.

## Licencias y créditos

Efemérides: Astronomy Engine (MIT). Ciudades: GeoNames (CC BY 4.0, atribución incluida en el pie). Zonas horarias: geo-tz.
