/**
 * Minimal CSV parser for FIRMS responses: a header row followed by rows of
 * plain, mostly-numeric values. Handles quoted fields defensively even
 * though FIRMS data doesn't normally need them.
 */
export function parseCsv(text: string, delimiter = ","): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

export function toNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}
