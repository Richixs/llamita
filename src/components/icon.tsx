import type { CSSProperties } from "react";
const paths = {
  search: "M21 21l-5-5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0",
  close: "m6 6 12 12M6 18 18 6",
  calendar: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  chevron: "m6 9 6 6 6-6",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  chart: "M3 3v18h18M8 16v-5M13 16V7M18 16V9",
  file: "M14 2H4v20h16V8Zm0 0v6h6M8 12h8M8 16h8M8 8h2",
  download: "M12 2v13m-5-5 5 5 5-5M3 15v6h18v-6",
  map: "m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3Zm6-3v17M15 5v17",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  layers: "m2 7 10-5 10 5-10 5Zm0 5 10 5 10-5M2 17l10 5 10-5",
  target: "M12 1v5M12 18v5M1 12h5M18 12h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  expand: "M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5",
  plus: "M12 4v16M4 12h16",
  minus: "M4 12h16",
  help: "M9 8a3 3 0 1 1 5 2.3c-2 1-2 2-2 2M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "m4 12 5 5L20 6",
  copy: "M8 8h13v13H8ZM16 4V2H2v14h2",
  refresh:
    "M21 3v6h-6M3 21v-6h6M20 9A8 8 0 0 0 5 5L3 9M4 15a8 8 0 0 0 15 4l2-4",
  filter: "M2 3h20l-8 9v9l-4-2v-7Z",
  // GitHub mark from Lucide (ISC license).
  github:
    "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2",
  flame:
    "M12 2c3 5-2 7 1 10 1-2 2-3 3-4 1 4 4 5 4 9a8 8 0 0 1-16 0c0-3 2-5 3-7-1 4 2 4 2 2 0-4 5-5 3-10Z",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  style,
  className = "",
}: {
  name: IconName;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      style={style}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
