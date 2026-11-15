import type { Metadata } from "next";
import Link from "next/link";
import { boliviaToday } from "@/lib/geo/catalog";
import { dateLabel } from "@/lib/llamita/filters";
import { Icon, type IconName } from "@/components/icon";
import { CopyCitation } from "@/components/copy-citation";
import "@/components/statistics.css";
import "./about.css";
export const metadata: Metadata = { title: "Acerca de y fuentes" };
export default function AboutPage() {
  const citation = `Fuente: Llamita, con datos de NASA FIRMS (VIIRS y MODIS) y capas municipales GAMC. Consultado el ${dateLabel(boliviaToday())}.`;
  const features: {
    icon: IconName;
    title: string;
    description: string;
    href: string;
  }[] = [
    {
      icon: "map",
      title: "Ver focos en el mapa",
      description:
        "Cada punto es un foco de calor detectado. Su color indica la potencia del fuego.",
      href: "/",
    },
    {
      icon: "filter",
      title: "Filtrar por fecha y lugar",
      description:
        "Consulta por fecha, rectángulo geográfico y sensor. Los filtros territoriales requieren límites vectoriales oficiales.",
      href: "/",
    },
    {
      icon: "file",
      title: "Generar reportes",
      description:
        "Descarga PDF, Excel, CSV, Shapefile o GeoJSON con los mismos datos del mapa.",
      href: "/reportes",
    },
  ];
  return (
    <main id="contenido" className="about-page">
      <p className="overline about-overline">Acerca de Llamita</p>
      <h1>Vigilar el fuego en Cochabamba, a tiempo</h1>
      <p className="about-intro">
        Llamita reúne detecciones satelitales de FIRMS y las capas municipales
        autorizadas por GAMC en el área de Cochabamba,
        <br className="desktop-break" /> para que brigadas, gobiernos
        municipales y comunidades puedan actuar antes de que un incendio crezca.
      </p>
      <div className="about-features">
        {features.map((f) => (
          <Link href={f.href} className="panel feature-card" key={f.title}>
            <span className="feature-icon">
              <Icon name={f.icon} />
            </span>
            <h4>{f.title}</h4>
            <p>{f.description}</p>
          </Link>
        ))}
      </div>
      <section id="fuentes" className="sources-section">
        <h2>De dónde vienen los datos</h2>
        <div className="table-scroll">
          <table className="data-table sources-table">
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Satélites</th>
                <th>Resolución</th>
                <th>Para qué sirve</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>VIIRS</th>
                <td>S-NPP, NOAA-20, NOAA-21</td>
                <td>375 m</td>
                <td>Detecta focos pequeños; es la fuente principal.</td>
              </tr>
              <tr>
                <th>MODIS</th>
                <td>Aqua, Terra</td>
                <td>1 km</td>
                <td>Serie histórica larga para comparar años.</td>
              </tr>
              <tr>
                <th>GAMC</th>
                <td>Periurbanos, Cota 2750 y Límite Distritos</td>
                <td>—</td>
                <td>Mapas, leyendas y atributos puntuales en su cobertura.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted">
          Los datos satelitales provienen de{" "}
          <a
            className="text-link"
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noreferrer"
          >
            NASA FIRMS
          </a>{" "}
          y se actualizan después de cada paso de satélite (normalmente en menos
          de 3 horas). Las horas se muestran en hora de Bolivia (UTC−4).
        </p>
        <p className="notice demo-disclosure">
          El modo real consulta FIRMS por rectángulo geográfico y muestra las
          tres capas GAMC autorizadas. Los límites de los 47 municipios, TCO y
          áreas protegidas aún no están disponibles para asignar o agrupar
          detecciones. El modo de ejemplo utiliza datos ilustrativos de
          noviembre de 2026 y está separado de las consultas reales.
        </p>
      </section>
      <div className="about-definitions">
        <section>
          <h4>Foco de calor</h4>
          <p>
            Punto donde el satélite detecta una temperatura anormalmente alta.
            Puede ser un incendio, un chaqueo o una quema controlada.
          </p>
        </section>
        <section>
          <h4>Potencia (FRP)</h4>
          <p>
            Energía que emite el fuego, en megavatios. Más potencia suele
            indicar un fuego más grande o intenso.
          </p>
        </section>
        <section>
          <h4>Actualización</h4>
          <p>
            Los focos nuevos aparecen después de cada paso de satélite, varias
            veces al día.
          </p>
        </section>
      </div>
      <section className="citation">
        <h4>Cómo citar</h4>
        <div className="row">
          <p className="mono">{citation}</p>
          <CopyCitation text={citation} />
        </div>
      </section>
    </main>
  );
}
