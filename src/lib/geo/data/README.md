# Fuentes geográficas

`countries.json` contiene los polígonos Admin 0 de Natural Earth a escala 1:50m, con las propiedades `ADM0_A3` y `NAME_ES` normalizadas como `code` y `name`. `country-catalog.json` contiene sus nombres y extensiones para el selector del navegador.

Fuente: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson

Natural Earth es de dominio público: https://www.naturalearthdata.com/about/terms-of-use/

Son límites cartográficos generalizados, no una declaración legal de fronteras. Los puntos fuera de los polígonos (p. ej. mar, costas e islas pequeñas) se conservan en la consulta mundial como «Sin asignar». La selección de país aplica recorte por polígono, no solo por rectángulo.

Los archivos de provincias y municipios corresponden únicamente a Cochabamba y se mantienen para el reto local.

`map-context.json` contiene anillos de Natural Earth 1:50m simplificados con una tolerancia de 0,05 grados para mostrar fronteras cuando el mapa base no está disponible. No se usa esta simplificación para asignar ni filtrar países. Las previsualizaciones y los PDF incorporan teselas de OpenStreetMap cuando hay conexión.
