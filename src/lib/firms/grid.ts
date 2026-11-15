import type { Detection } from "@/lib/llamita/data";

// Latitude bands keep east-west cells close to 1 km at every latitude.
const LAT_STEP = 1000 / 111320;
export function gridCell(lat: number, lon: number): string {
  const row = Math.floor(lat / LAT_STEP);
  const centerLat = (row + 0.5) * LAT_STEP;
  const lonStep =
    1000 / (111320 * Math.max(0.001, Math.cos((centerLat * Math.PI) / 180)));
  return `${row}:${Math.floor(lon / lonStep)}`;
}

// Harmonizes VIIRS (375m pixels) and MODIS (1km pixels) onto a common grid:
// detections sharing a calendar day and grid cell are treated as the same
// fire event and collapsed into one record. Without this, the same fire
// shows up twice — once from each sensor, a few hundred meters apart — or
// several times from adjacent VIIRS sub-pixels inside one MODIS footprint.
export function harmonizeToGrid(detections: Detection[]): Detection[] {
  const groups = new Map<string, Detection[]>();
  for (const d of detections) {
    const key = `${d.date}:${gridCell(d.latitude, d.longitude)}`;
    const group = groups.get(key);
    if (group) group.push(d);
    else groups.set(key, [d]);
  }

  const result: Detection[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    // VIIRS resolves finer detail than MODIS (375m vs 1km), so its
    // coordinates/time become the representative when both agree; within
    // the same sensor, the brightest pixel wins.
    const representative = [...group].sort((a, b) => {
      if (a.satellite !== b.satellite) return a.satellite === "VIIRS" ? -1 : 1;
      return b.frp - a.frp;
    })[0];
    const detectedBy = [
      ...new Set(
        group.map((d) => d.source).filter((s): s is string => Boolean(s)),
      ),
    ];
    result.push({
      ...representative,
      id: `firms-grid-${representative.date}-${gridCell(representative.latitude, representative.longitude)}`,
      // The group's highest reading, not a sum: cross-sensor pixels often
      // overlap the same burning area, so adding them would double-count.
      frp: Math.max(...group.map((d) => d.frp)),
      detectedBy,
      observationCount: group.length,
    });
  }
  return result;
}
