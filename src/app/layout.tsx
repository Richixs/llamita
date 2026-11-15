import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/components/app-provider";
import { Header } from "@/components/header";
import "./globals.css";

const display = localFont({
  src: [
    { path: "../../public/fonts/space-grotesk-500.ttf", weight: "500" },
    { path: "../../public/fonts/space-grotesk-700.ttf", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});
const text = localFont({
  src: [
    { path: "../../public/fonts/ibm-plex-sans-400.ttf", weight: "400" },
    { path: "../../public/fonts/ibm-plex-sans-500.ttf", weight: "500" },
    { path: "../../public/fonts/ibm-plex-sans-600.ttf", weight: "600" },
  ],
  variable: "--font-text",
  display: "swap",
});
const data = localFont({
  src: [
    { path: "../../public/fonts/ibm-plex-mono-400.ttf", weight: "400" },
    { path: "../../public/fonts/ibm-plex-mono-500.ttf", weight: "500" },
  ],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Llamita · Focos de calor en Cochabamba",
    template: "%s · Llamita",
  },
  description:
    "Explora los focos de calor de Cochabamba, consulta estadísticas y genera reportes por fecha y lugar.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${text.variable} ${data.variable}`}
    >
      <body>
        <AppProvider>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <Header />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
