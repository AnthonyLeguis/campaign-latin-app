# Campaign Latin App

Aplicación web desarrollada con React, TypeScript y Vite, orientada a campañas de pre-calificación para programas de gastos funerarios en EE.UU. con enfoque mobile-first y experiencia visual tipo landing page.

## Características principales

- **SPA pura sin rutas en la URL:**

  - Navegación y flujo controlados por contexto, sin mostrar rutas en el navegador.
  - El usuario siempre inicia desde la pantalla principal y no puede saltar pasos ni guardar rutas.

- **Inactividad y seguridad de flujo:**

  - Si el usuario permanece 2 minutos sin interactuar en una vista, es redirigido automáticamente a la pantalla principal.
  - No es posible acceder a vistas intermedias directamente desde el navegador.

- **Diseño Sensacionalista y Mobile-First:**

  - Header con badge inclinado "BREAKING NEWS" y fondo con gradiente blanco-rojo-azul.
  - Footer con disclaimer y enlaces externos (Política de Privacidad, Términos de Servicio).
  - Layout responsivo usando Tailwind CSS y grid/flex.

- **Navegación y Vistas:**

  - `View1`: Checkpoints de beneficios, botón de avance con icono PointingHand.
  - `View2`: Pregunta "¿Vives en los Estados Unidos?" con botones Sí/No. Reproduce audio al cargar.
  - `View3`: Pregunta "¿Tienes más de 40 años?" con botones Sí/No. Reproduce audio al cargar.
  - `FinalView`: Mensaje de felicitación, botón "Llama Ahora" que redirige a llamada telefónica, información dinámica de espera y agentes, imagen del congreso con blend mode para resaltar, animaciones y efectos visuales de celebración.
  - `NotAble`: Mensaje diplomático si el usuario no califica, sin preguntas, permite cierre manual.

- **Componentes personalizados:**

  - `PointingHand`: GIF animado, color blanco, tamaño ajustable, usado en botones principales.

- **Audio:**

  - Reproducción automática (con delay) en cada vista relevante (`View2`, `View3`, `FinalView`).

- **Animaciones y estética mejorada:**
  - Transiciones de entrada/salida entre vistas (slide in/out).
  - Título "CONGRATULATIONS!" con líneas rojas gradientes, sombra y efecto shimmer.
  - Texto "¡Pre calificaste!" con gradiente dorado, fuente especial y animación de pulso.
  - Partículas de estrellas doradas animadas en la vista final.
  - Imagen del congreso con blend mode para fondo blanco menos visible.

## Estructura de carpetas

- `/src/components/` - Componentes reutilizables (Layout, PointingHand, ViewContainer)
- `/src/pages/` - Vistas principales (View1, View2, View3, FinalView, NotAble)
- `/src/context/` - Contexto de navegación SPA
- `/src/hooks/` - Hooks personalizados (inactividad)
- `/public/audio/` - Audios para cada vista
- `/public/images/` - Imágenes usadas en el diseño

## Instalación y ejecución

```bash
npm install
npm run dev
```

## Meta Conversions API (CAPI)

- Configura las variables de entorno (ver `.env.example`) con:
  - `META_PIXEL_ID`: ID de tu píxel.
  - `META_CAPI_TOKEN`: Access Token de Conversions API.
  - Opcional: `META_CAPI_TEST_CODE` para validar en **Test Events** y `META_CAPI_PORT` para cambiar el puerto (por defecto 8787).
- Inicia el servidor que envía los eventos server-side:

```bash
npm run capi-server
```

- En paralelo, ejecuta la app (`npm run dev`) y navega al sitio. Cada visita envía un evento `PageView` server-side usando IP/User-Agent para **coincidencias avanzadas**.
- Para enviar eventos adicionales (por ejemplo tras una conversión) puedes llamar a `sendMetaCapiEvent` desde cualquier componente de React:

```ts
import { sendMetaCapiEvent } from "../lib/metaCapi"; // ajusta la ruta según tu archivo

sendMetaCapiEvent({
  eventName: "Lead",
  customData: {
    value: 0,
    currency: "USD",
  },
});
```

- Recuerda mantener el token privado y anunciar en tu política de privacidad que se envían eventos a Meta con CAPI.

## Personalización

- Cambia los textos, audios o imágenes en las carpetas correspondientes.
- Modifica los parámetros de espera y agentes en `FinalView` para mostrar datos dinámicos.
- Puedes ajustar los efectos visuales y animaciones en `index.css`.

## Créditos

Desarrollado por AnthonyLeguis y colaboradores.

---

# Documentación original Vite + React

Este template proporciona una configuración mínima para hacer funcionar React en Vite con HMR y algunas reglas de ESLint.

Actualmente, hay dos plugins oficiales disponibles:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) usa [Babel](https://babeljs.io/) (o [oxc](https://oxc.rs) cuando se usa en [rolldown-vite](https://vite.dev/guide/rolldown)) para Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) usa [SWC](https://swc.rs/) para Fast Refresh

## Compilador de React

El compilador de React no está habilitado en este template debido a su impacto en el rendimiento de desarrollo y construcción. Para añadirlo, consulta [esta documentación](https://react.dev/learn/react-compiler/installation).

## Expandiendo la configuración de ESLint

Si estás desarrollando una aplicación para producción, se recomienda actualizar la configuración para habilitar reglas de linting conscientes del tipo:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Otras configuraciones...

      // Eliminar tseslint.configs.recommended y reemplazar con esto
      tseslint.configs.recommendedTypeChecked,
      // Alternativamente, usa esto para reglas más estrictas
      tseslint.configs.strictTypeChecked,
      // Opcionalmente, añade esto para reglas estilísticas
      tseslint.configs.stylisticTypeChecked,

      // Otras configuraciones...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // otras opciones...
    },
  },
]);
```

También puedes instalar [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) y [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) para reglas de linting específicas de React:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Otras configuraciones...
      // Habilitar reglas de lint para React
      reactX.configs["recommended-typescript"],
      // Habilitar reglas de lint para React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // otras opciones...
    },
  },
]);
```
