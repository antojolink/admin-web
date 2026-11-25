# AntojoLink · Panel administrativo

Frontend React + Vite de los tickets [#6](https://github.com/antojolink/sass-core/issues/6) y [#9](https://github.com/antojolink/sass-core/issues/9). Se conecta al backend `sass-core` mediante Cognito y a S3 mediante URLs prefirmadas.

```bash
cp .env.example .env
npm ci
npm run dev
```

Abre `http://localhost:5173`. Configura en `.env` los valores reales de Cognito, API y menú. El app client de Cognito debe ser **público, sin client secret**, con `USER_PASSWORD_AUTH` habilitado. Un usuario con contraseña temporal verá el formulario para cambiarla. El token de ID se guarda en `sessionStorage` y se envía al backend como `Authorization: Bearer`.

Rutas: `/login`, `/onboarding`, `/dashboard`, `/categorias`, `/productos`, `/configuracion`. Se crea el restaurante en onboarding; después se pueden administrar categorías y productos, subir fotos y logo, cambiar disponibilidad y descargar el QR. El QR usa `VITE_MENU_BASE_URL/<slug>`.

La API debe incluir `http://localhost:5173` y los dominios desplegados en `CORS_ORIGINS`. El bucket de imágenes necesita CORS para `PUT` desde esos orígenes, con `Content-Type` permitido. Las rutas del panel en S3/CloudFront deben devolver `/index.html` para recargas directas.

`npm test`, `npm run lint` y `npm run build` verifican el proyecto. Los workflows usan GitHub Environments `dev` y `prod`; configura aprobación requerida en `prod` desde GitHub. Variables de cada environment: `AWS_ROLE_ARN`, `S3_BUCKET`, `CLOUDFRONT_ID`, `API_URL`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `AWS_REGION`, `MENU_BASE_URL`.

## Demostración local sin Cognito

Con `sass-core` levantado mediante Docker Compose en modo desarrollo, crea `.env.local` con `VITE_API_URL=http://localhost:3000`, `VITE_MENU_BASE_URL=http://localhost:4321` y `VITE_DEMO_MODE=true`. Ejecuta `npm run dev` y usa **Entrar en modo demo local**. El backend acepta la identidad de prueba solo cuando `NODE_ENV=development` y `DEV_AUTH_BYPASS=true`; el botón y los encabezados de demostración se eliminan del build de producción. Los datos creados permanecen en la base PostgreSQL local de Docker.
