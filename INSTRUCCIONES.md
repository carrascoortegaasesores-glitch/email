# Carrasco Ortega Asesores · Instrucciones de despliegue

## Qué necesitas
- Cuenta en github.com (gratis)
- Cuenta en vercel.com (gratis)
- Tu API key de Anthropic (console.anthropic.com)

---

## Paso 1 — Subir el proyecto a GitHub

1. Entra en github.com e inicia sesión
2. Pulsa el botón verde "New" (repositorio nuevo)
3. Nómbralo: coasesores-app
4. Marca "Private" (para que sea privado)
5. Pulsa "Create repository"
6. En la pantalla siguiente, pulsa "uploading an existing file"
7. Arrastra TODA la carpeta coasesores-app aquí
8. Pulsa "Commit changes"

---

## Paso 2 — Desplegar en Vercel

1. Entra en vercel.com e inicia sesión con tu cuenta de GitHub
2. Pulsa "Add New Project"
3. Selecciona el repositorio "coasesores-app"
4. Vercel lo detectará como proyecto Next.js automáticamente
5. ANTES de pulsar Deploy, ve a "Environment Variables" y añade:
   - Nombre: ANTHROPIC_API_KEY
   - Valor: tu clave sk-ant-api03-... (la nueva que habrás generado)
6. Pulsa "Deploy"
7. En 2 minutos tendrás tu enlace: coasesores-app.vercel.app

---

## Paso 3 — Compartir con tu equipo

Comparte el enlace con tus empleados. Pueden abrirlo desde cualquier
navegador (móvil u ordenador) sin instalar nada.

Para un dominio personalizado tipo "app.coasesores.es", desde Vercel →
Settings → Domains, puedes añadirlo gratis.

---

## Seguridad

- La API key NUNCA aparece en el código — solo vive en Vercel como
  variable de entorno de servidor
- El repositorio es privado en GitHub
- Solo quien tenga el enlace puede acceder a la app
