import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="bg-background text-ink flex flex-1 flex-col">
      {/* Top Navbar (30% Charcoal structure) */}
      <header className="bg-charcoal text-smoke border-border/10 border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo theme="dark" />
          <span className="bg-fire-soft text-fire font-mono rounded-full px-3 py-1 text-xs font-medium">
            NASA FIRMS · LIVE
          </span>
        </div>
      </header>

      {/* Main Content (60% Base / Surface) */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-16">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Logo variant="mark" markClassName="h-5 w-auto" />
            <span className="text-fire font-mono text-xs font-semibold tracking-widest uppercase">
              Sistema de Monitoreo Satelital
            </span>
          </div>
          <h1 className="font-display text-ink max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Vigilar el fuego en tiempo real
          </h1>
          <p className="text-ink-muted max-w-xl text-lg leading-relaxed">
            Detección temprana y seguimiento de focos de calor e incendios
            forestales mediante datos satelitales VIIRS y MODIS.
          </p>

          {/* 10% Fire / Action Buttons */}
          <div className="mt-2 flex flex-wrap gap-4">
            <button className="bg-fire hover:bg-fire-hover active:bg-fire-active text-surface cursor-pointer rounded-md px-5 py-2.5 font-medium transition-colors">
              Explorar mapa activo
            </button>
            <button className="bg-surface hover:bg-surface-2 border-border text-ink cursor-pointer rounded-md border px-5 py-2.5 font-medium transition-colors">
              Nuevo reporte
            </button>
          </div>
        </section>

        {/* Sample Cards & Typography Verification */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-surface border-border rounded-lg border p-5">
            <p className="text-ink-muted text-sm font-medium">
              Focos activos (24h)
            </p>
            <p className="font-mono text-ink mt-2 text-3xl font-semibold">
              1,284
            </p>
            <span className="bg-danger-soft text-danger mt-3 inline-block rounded px-2 py-0.5 text-xs font-medium">
              +14% vs. ayer
            </span>
          </div>

          <div className="bg-surface border-border rounded-lg border p-5">
            <p className="text-ink-muted text-sm font-medium">
              Coordenada más reciente
            </p>
            <p className="font-mono text-ink mt-2 text-lg font-medium">
              -16.7120, -61.1843
            </p>
            <span className="bg-warning-soft text-warning mt-3 inline-block rounded px-2 py-0.5 text-xs font-medium">
              Confianza nominal · VIIRS
            </span>
          </div>

          <div className="bg-surface border-border rounded-lg border p-5">
            <p className="text-ink-muted text-sm font-medium">
              Escala de intensidad térmica
            </p>
            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full">
              <div className="bg-heat-1 flex-1" title="Heat 1" />
              <div className="bg-heat-2 flex-1" title="Heat 2" />
              <div className="bg-heat-3 flex-1" title="Heat 3" />
              <div className="bg-heat-4 flex-1" title="Heat 4" />
              <div className="bg-heat-5 flex-1" title="Heat 5" />
            </div>
            <div className="text-ink-faint font-mono mt-2 flex justify-between text-xs">
              <span>Baja</span>
              <span>Extrema</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
