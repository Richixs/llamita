export interface Filters {
  mode: "day" | "range";
  from: string;
  to: string;
  continent?: string;
  country?: string;
  province: string;
  municipality: string;
  territory: string;
  protectedArea: string;
  satellite: "all" | "VIIRS" | "MODIS";
}
export const initialFilters: Filters = {
  mode: "day",
  from: "",
  to: "",
  country: "",
  continent: "",
  province: "",
  municipality: "",
  territory: "",
  protectedArea: "",
  satellite: "all",
};
export const number = (value: number) =>
  new Intl.NumberFormat("es-BO").format(value);
export function dateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!date || !Number.isFinite(Date.parse(date)))
    return "Fecha no seleccionada";
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/La_Paz",
    ...options,
  }).format(new Date(`${date}T12:00:00-04:00`));
}
export function periodLabel(filters: Pick<Filters, "mode" | "from" | "to">) {
  return filters.mode === "day"
    ? dateLabel(filters.to, { weekday: "short" })
    : `${dateLabel(filters.from)} al ${dateLabel(filters.to)}`;
}
export function dateOffset(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function periodError(from: string, to: string) {
  if (!from || !to) return "Selecciona las fechas del periodo.";
  if (
    ![from, to].every(
      (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value,
    )
  )
    return "Las fechas no son válidas.";
  if (from > to)
    return "La fecha de inicio debe ser anterior o igual a la fecha final.";
  if (from < "2000-01-01") return "El histórico comienza en el año 2000.";
  return "";
}
