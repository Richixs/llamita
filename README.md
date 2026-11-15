# Llamita

Mapa mundial de focos de calor VIIRS y MODIS de NASA FIRMS, filtros por continente y país, estadísticas e informes. Cochabamba conserva los filtros municipales y las capas GAMC como reto local.

## Desarrollo

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env
# Completar FIRMS_MAP_KEY y, para las capas del reto local, GAMC_API_KEY.
docker compose up -d redis
corepack pnpm dev
```

`REDIS_URL=redis://127.0.0.1:6379` activa la caché compartida. En un alojamiento externo, configura la URL del servicio Redis (`redis://` o `rediss://`) únicamente en el servidor. No se expone al navegador. Redis es opcional: si falta o falla, se utiliza caché local acotada. Las consultas se almacenan comprimidas durante cinco minutos; no se guardan claves FIRMS en Redis. Los errores de NASA no se cachean. Las consultas simultáneas idénticas en una instancia comparten la misma petición.

## Cobertura e histórico

La [API de área de FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area) admite un rectángulo o `world`. El histórico puede seleccionarse desde 2000 hasta la fecha actual, incluidos periodos de varios años. Se combina el archivo SP con los productos NRT según la disponibilidad publicada por NASA; VIIRS no tiene observaciones en los primeros años de MODIS. Los periodos se dividen en bloques para respetar el límite de cinco días de cada petición a NASA. Las consultas de cobertura amplia se procesan en bloques de cinco días; las regionales agrupan hasta un año por respuesta.

Un histórico mundial de muchos años puede requerir numerosas consultas y una sesión prolongada. La cuota de la MAP_KEY y la disponibilidad de NASA siguen aplicándose. Un resultado vacío o con avisos no demuestra ausencia de incendios. Las horas se presentan en UTC−4 para conservar una referencia uniforme.

Los países y continentes se filtran por los polígonos de Natural Earth, no únicamente por su rectángulo. Los límites generalizados pueden dejar costas e islas pequeñas sin asignar. Ver [fuentes geográficas](src/lib/geo/data/README.md).

## Comprobaciones

```bash
corepack pnpm test
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```
