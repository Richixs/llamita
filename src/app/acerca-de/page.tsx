import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { CopyCitation } from "@/components/copy-citation";
import "@/components/statistics.css";
import "./about.css";
export const metadata: Metadata = { title: "Acerca de y fuentes" };
const citation =
  "Fuente: Llamita, con datos de NASA FIRMS (VIIRS y MODIS). Consultado el 14 nov 2026.";
export default function AboutPage() {
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
        "Elige un día o un rango, y busca por provincia, municipio, TCO o área protegida.",
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
        Llamita muestra los focos de calor que detectan los satélites sobre los
        47 municipios de Cochabamba,
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
                <th>Límites</th>
                <td>Departamento y 47 municipios</td>
                <td>—</td>
                <td>Filtrar y agrupar por municipio y provincia.</td>
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
          Esta versión muestra datos de ejemplo del 1 al 14 de noviembre de
          2026. Los límites, las capas y las coordenadas son ilustrativos; no
          representan información operativa en tiempo real.
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
