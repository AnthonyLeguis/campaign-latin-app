# Campaign Latin App

Aplicación web desarrollada con React, TypeScript y Vite, orientada a campañas de pre-calificación para programas de gastos funerarios en EE.UU. con enfoque mobile-first y experiencia visual tipo landing page.

## Características principales

- **Diseño Sensacionalista y Mobile-First:**
  - Header con badge inclinado "BREAKING NEWS" y fondo con gradiente rojo-azul.
  - Footer con disclaimer y enlaces externos (Política de Privacidad, Términos de Servicio).
  - Layout responsivo usando Tailwind CSS y grid/flex.

- **Navegación y Vistas:**
  - `View1`: Checkpoints de beneficios, botón de avance con icono PointingHand.
  - `View2`: Pregunta "¿Vives en los Estados Unidos?" con botones Sí/No. Reproduce audio al cargar.
  - `View3`: Pregunta "¿Tienes más de 40 años?" con botones Sí/No. Reproduce audio al cargar.
  - `FinalView`: Mensaje de felicitación, botón "Llama Ahora" que redirige a llamada telefónica, información dinámica de espera y agentes, imagen del congreso con blend mode para resaltar.
  - `NotAble`: Mensaje diplomático si el usuario no califica, sin preguntas, permite cierre manual.

- **Componentes personalizados:**
  - `PointingHand`: GIF animado, color blanco, tamaño ajustable, usado en botones principales.

- **Audio:**
  - Reproducción automática (con delay) en cada vista relevante (`View2`, `View3`, `FinalView`).

- **Bloqueo de navegación:**
  - Deshabilita botones de back/next del navegador en vistas principales para controlar el flujo.

- **Estética mejorada:**
  - Título "CONGRATULATIONS!" con líneas rojas gradientes y sombra.
  - Imagen del congreso con blend mode para fondo blanco menos visible.

## Estructura de carpetas

- `/src/components/` - Componentes reutilizables (Layout, PointingHand)
- `/src/pages/` - Vistas principales (View1, View2, View3, FinalView, NotAble)
- `/public/audio/` - Audios para cada vista
- `/public/images/` - Imágenes usadas en el diseño

## Instalación y ejecución

```bash
npm install
npm run dev
```

## Personalización
- Cambia los textos, audios o imágenes en las carpetas correspondientes.
- Modifica los parámetros de espera y agentes en `FinalView` para mostrar datos dinámicos.

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
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
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
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // otras opciones...
    },
  },
])
```

También puedes instalar [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) y [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) para reglas de linting específicas de React:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Otras configuraciones...
      // Habilitar reglas de lint para React
      reactX.configs['recommended-typescript'],
      // Habilitar reglas de lint para React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // otras opciones...
    },
  },
])
```
