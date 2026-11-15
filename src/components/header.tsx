"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";
import { Icon } from "./icon";
export function Header() {
  const pathname = usePathname();
  const { mode, loading, error, fetchedAt } = useApp();
  if (pathname === "/reportes/pdf") return null;
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Llamita, ir al mapa">
        <Image
          src="/brand/llamita-logo-para-fondo-oscuro.svg"
          alt="llamita"
          width={90}
          height={36}
          priority
        />
      </Link>
      <nav className="site-nav" aria-label="Navegación principal">
        {[
          ["/", "Mapa"],
          ["/estadisticas", "Estadísticas"],
          ["/acerca-de", "Acerca de"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions row">
        <span
          className="data-status"
          title={
            mode === "demo"
              ? "Datos ilustrativos del diseño"
              : fetchedAt
                ? `Última consulta: ${new Date(fetchedAt).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}`
                : "Detecciones de NASA FIRMS"
          }
        >
          <span className="status-dot" />
          {mode === "demo"
            ? "Datos de ejemplo · nov 2026"
            : loading
              ? "Consultando FIRMS…"
              : error
                ? "FIRMS no disponible"
                : "NASA FIRMS · datos reales"}
        </span>
        <Link
          href="/acerca-de#fuentes"
          className="icon-btn"
          aria-label="Ayuda y fuentes de datos"
        >
          <Icon name="help" />
        </Link>
        <Link
          href="/reportes"
          className="btn btn-primary"
          aria-current={pathname === "/reportes" ? "page" : undefined}
        >
          <Icon name="file" />
          Generar reporte
        </Link>
      </div>
    </header>
  );
}
