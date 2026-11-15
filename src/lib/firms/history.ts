import {
  isWideArea,
  MAX_GLOBAL_QUERY_DAYS,
  type Bbox,
} from "@/lib/geo/catalog";
import { periodError } from "@/lib/llamita/filters";
export function historyChunks(from: string, to: string, bbox: Bbox) {
  const error = periodError(from, to);
  if (error) throw new Error(error);
  const size = isWideArea(bbox) ? MAX_GLOBAL_QUERY_DAYS : 31;
  const result: { from: string; to: string }[] = [];
  const end = Date.parse(to);
  for (let start = Date.parse(from); start <= end; start += size * 86400000)
    result.push({
      from: new Date(start).toISOString().slice(0, 10),
      to: new Date(Math.min(end, start + (size - 1) * 86400000))
        .toISOString()
        .slice(0, 10),
    });
  return result;
}
export interface QueryProgress {
  completed: number;
  total: number;
}
