interface LogoProps {
  variant?: "full" | "mark";
  theme?: "light" | "dark";
  className?: string;
  markClassName?: string;
}

export function Logo({
  variant = "full",
  theme = "light",
  className = "",
  markClassName = "h-8 w-auto",
}: LogoProps) {
  const textColor = theme === "dark" ? "text-smoke" : "text-ink";

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${
        variant === "full" ? "min-w-[96px]" : "min-w-[16px]"
      } ${className}`}
    >
      <svg
        viewBox="0 0 62 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${markClassName}`}
        aria-hidden="true"
      >
        <path
          d="M31 107.958C11.625 107.958 1.29164 96.3334 1.93748 82.1251C2.58331 69.2084 9.04164 60.8126 14.8541 51.1251C16.7916 58.2292 18.0833 63.3959 21.3125 65.9792C17.4375 52.4167 20.0208 40.1459 27.7708 31.1042C34.2291 23.3542 32.9375 13.6667 29.0625 2.04175C42.625 11.7292 47.7916 25.2917 43.9166 40.1459C42.3021 46.6042 43.2708 51.1251 46.5 54.3542C47.7916 47.8959 51.0208 44.0209 55.5416 40.1459C61.3541 53.7084 61.3541 67.2709 60.0625 80.8334C58.7708 96.3334 49.7291 107.958 31 107.958ZM31.5812 61.523L32.0172 56.2917L33.7609 59.7792L35.5047 56.2917L36.3765 60.6511C39.4281 61.0871 42.0437 62.3949 42.0437 64.5746C42.0437 66.3183 40.3 66.7542 38.5562 66.7542H37.6843V78.0886C37.6843 82.448 36.8125 85.0636 35.9406 86.8074V97.2699H33.7609L33.325 88.5511H32.4531L32.0172 97.2699H29.8375L29.4015 87.6793H26.35L25.914 97.2699H23.7344L23.2984 88.5511H22.4265L21.9906 97.2699H19.8109L19.375 85.9355C18.0672 83.3199 18.0672 79.8324 20.2469 78.0886C18.939 77.2167 18.5031 75.473 19.375 74.6011C21.1187 76.3449 22.8625 76.7808 25.4781 76.7808H31.5812V61.523Z"
          fillRule="evenodd"
          clipRule="evenodd"
          className="fill-fire"
        />
      </svg>

      {variant === "full" && (
        <span
          className={`font-display text-2xl font-bold tracking-tight ${textColor}`}
        >
          llamita
        </span>
      )}
    </div>
  );
}
