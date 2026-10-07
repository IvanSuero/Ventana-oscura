// Configuración del sitio. Cambia estos valores antes de publicar.
module.exports = {
  // URL pública final, sin barra al final (p. ej. https://ventanaoscura.com).
  siteUrl: process.env.SITE_URL || 'https://ivansuero.github.io',
  // Si publicas en GitHub Pages sin dominio propio (usuario.github.io/repo), pon '/repo/'. Con dominio propio: '/'.
  basePath: process.env.BASE_PATH || '/Ventana-oscura/',
  siteName: 'Ventana Oscura',
  tagline: 'Cuándo es de noche de verdad en tu ciudad',
  // Monetización (opcional). Déjalo vacío hasta que te aprueben.
  adsenseClient: process.env.ADSENSE_CLIENT || '', // p. ej. 'ca-pub-1234567890123456'
  amazonTag: process.env.AMAZON_TAG || '',         // p. ej. 'ventanaoscura-21'
  contactEmail: process.env.CONTACT_EMAIL || 'hola@ventanaoscura.com',
  // Google Search Console: meta de verificación (opcional)
  googleVerification: process.env.GOOGLE_VERIFICATION || '',
};
