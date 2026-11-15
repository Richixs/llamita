import type { Detection } from "@/lib/llamita/data";

// ~1km grid, calibrated to Cochabamba's latitude band so a fixed-degree
// step corresponds to roughly the same real-world distance on both axes
// (longitude degrees shrink with latitude; a global equal-area grid is
// overkill for an app scoped to one department).
const CENTER_LAT_DEG = -17.4;
const METERS_PER_DEGREE_LAT = 111320;
const GRID_SIZE_METERS = 1000;
const LAT_STEP = GRID_SIZE_METERS / METERS_PER_DEGREE_LAT;
const LON_STEP =
  GRID_SIZE_METERS /
  (METERS_PER_DEGREE_LAT * Math.cos((CENTER_LAT_DEG * Math.PI) / 180));

export function gridCell(lat: number, lon: number): string {
  return `${Math.floor(lat / LAT_STEP)}:${Math.floor(lon / LON_STEP)}`;
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
