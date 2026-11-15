"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { Logo } from "./ui/logo";
export function Header() {
  const pathname = usePathname();
  if (pathname === "/reportes/pdf") return null;
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Llamita, ir al mapa">
        <Logo theme="dark" />
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
          title="Las cifras corresponden a las vistas de referencia, no a detecciones en tiempo real."
        >
          <span className="status-dot" />
          Datos de ejemplo · nov 2026
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
