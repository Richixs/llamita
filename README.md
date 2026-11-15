# Llamita

Interfaz para explorar focos de calor en Cochabamba, consultar estadísticas y generar reportes. Implementada con Next.js, React y TypeScript a partir de la guía de estilos y las nueve vistas de referencia.

## Ejecutar con Docker

Con Docker y Compose disponibles:

```bash
docker compose --profile dev up --build
```

Abre [localhost:3000](http://localhost:3000). El perfil `dev` actualiza la aplicación al guardar cambios.

```bash
docker compose --profile dev down
```

Para compilar y ejecutar la versión de producción:

```bash
docker compose --profile prod up --build -d
```

Los perfiles utilizan el mismo puerto; ejecuta uno a la vez.

## Ejecutar sin Docker

```bash
corepack pnpm install
corepack pnpm dev
```

```bash
corepack pnpm build
corepack pnpm start
```

Las fuentes y sus licencias están incluidas en `public/fonts`, por lo que no se requiere conexión a Google Fonts para compilar.

## Vistas e interacciones

- `/`: mapa de un día o rango con calendario nativo, filtros de provincia, municipio, TCO, área protegida y sensor; búsqueda, estado sin resultados, capas, zoom, arrastre y pantalla completa.
- `/estadisticas`: indicadores, gráficos calculados con los filtros del mapa, tabla paginada, descarga CSV y enlaces a cada foco.
- `/reportes`: selección de lugares, fechas, contenido y formato; vista previa e historial local de los últimos 30 días. PDF, Excel, CSV, Shapefile ZIP y GeoJSON se generan en el navegador.
- `/reportes/pdf`: reporte A4 con las secciones elegidas, preparado para imprimir o guardar como PDF.
- `/acerca-de`: explicación de la aplicación, fuentes y cita copiable.

Los filtros se conservan durante la navegación. El historial de reportes se guarda en este navegador; no hay una cola de trabajos ni almacenamiento de archivos en un servidor.

## Datos de ejemplo y NASA FIRMS

La interfaz usa un conjunto determinista de ejemplo del **1 al 14 de noviembre de 2026**, separado de la API. El encabezado, la página de fuentes y los archivos exportados lo identifican como ejemplo. Los mapas provienen de los SVG suministrados; sus capas, límites y coordenadas son ilustrativos. Las fechas rápidas usan el 14 de noviembre como fecha de referencia para poder reproducir las vistas.

Las cifras de las maquetas no son consistentes entre vistas (por ejemplo, el día 14 muestra 342 focos en el mapa y 27 en el gráfico). La aplicación calcula gráficos, totales y exportaciones a partir del mismo conjunto de ejemplo para mantenerlos consistentes.

Las rutas existentes `/api/firms/*` siguen disponibles. Para usarlas configura `FIRMS_MAP_KEY` en `.env.local` a partir de `.env.example`. **La interfaz todavía no consume estas rutas.** Conectar datos reales requiere límites geográficos oficiales y fuentes para las capas territoriales, áreas protegidas, bosque y cicatrices de quema.

El fondo satelital carga imágenes de Esri World Imagery y requiere conexión. Su colocación sobre el mapa de demostración es ilustrativa.

## Comprobaciones

```bash
corepack pnpm lint
corepack pnpm exec tsc --noEmit
corepack pnpm format:check
corepack pnpm build
```
