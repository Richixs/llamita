"use client";
import { useEffect, useState } from "react";
import type { HotspotResult } from "@/lib/firms/query";
import type { Bbox } from "@/lib/geo/catalog";
import { periodError } from "@/lib/llamita/filters";
import { historyChunks, type QueryProgress } from "@/lib/firms/history";
export const livePeriodError = periodError;
export async function fetchLiveDetections(
  from: string,
  to: string,
  sensor: string,
  bbox: Bbox,
  signal?: AbortSignal,
  options: {
    continent?: string;
    country?: string;
    onProgress?: (progress: QueryProgress) => void;
  } = {},
): Promise<HotspotResult> {
  const chunks = historyChunks(from, to, bbox);
  const data: HotspotResult["data"] = [];
  const warnings = new Set<string>();
  let fetchedAt = "";
  options.onProgress?.({ completed: 0, total: chunks.length });
  for (let i = 0; i < chunks.length; i++) {
    signal?.throwIfAborted();
    const params = new URLSearchParams({
      ...chunks[i],
      sensor,
      bbox: bbox.join(","),
    });
    if (options.continent) params.set("continent", options.continent);
    if (options.country) params.set("country", options.country);
    const response = await fetch(`/api/firms/hotspots?${params}`, {
      signal,
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        typeof body.error === "string"
          ? body.error
          : "No se pudieron obtener los focos de calor.",
      );
    if (!Array.isArray(body.data))
      throw new Error("La respuesta de detecciones no es válida.");
    for (const d of body.data) data.push(d);
    for (const warning of body.warnings || []) warnings.add(warning);
    fetchedAt = body.fetchedAt;
    options.onProgress?.({ completed: i + 1, total: chunks.length });
  }
  data.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.time.localeCompare(a.time) ||
      a.id.localeCompare(b.id),
  );
  return { data, warnings: [...warnings], fetchedAt, bbox, from, to };
}
export function useLiveDetections({
  from,
  to,
  sensor,
  bbox,
  country,
  continent,
  enabled = true,
}: {
  from: string;
  to: string;
  sensor: string;
  bbox: Bbox;
  country?: string;
  continent?: string;
  enabled?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const query = new URLSearchParams({
    from,
    to,
    sensor,
    bbox: bbox.join(","),
    country: country || "",
    continent: continent || "",
  }).toString();
  const requestKey = `${query}#${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    value?: HotspotResult;
    error?: string;
  }>({ key: "" });
  const [progress, setProgress] = useState<QueryProgress>({
    completed: 0,
    total: 0,
  });
  const validation = livePeriodError(from, to);
  useEffect(() => {
    if (!enabled || validation) return;
    const controller = new AbortController();
    const params = new URLSearchParams(query);
    const timer = setTimeout(() => {
      fetchLiveDetections(
        params.get("from")!,
        params.get("to")!,
        params.get("sensor")!,
        params.get("bbox")!.split(",").map(Number) as Bbox,
        controller.signal,
        {
          country: params.get("country") || undefined,
          continent: params.get("continent") || undefined,
          onProgress: (p) => {
            if (!controller.signal.aborted) setProgress(p);
          },
        },
      )
        .then((value) => {
          if (!controller.signal.aborted) setResult({ key: requestKey, value });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({
              key: requestKey,
              error:
                error instanceof Error
                  ? error.message
                  : "No se pudo consultar NASA FIRMS.",
            });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query, requestKey, validation]);
  const current = result.key === requestKey;
  return {
    data: enabled && current ? result.value?.data || [] : [],
    loading: enabled && !validation && !current,
    error: enabled ? validation || (current ? result.error || "" : "") : "",
    warnings: enabled && current ? result.value?.warnings || [] : [],
    fetchedAt: enabled && current ? result.value?.fetchedAt : undefined,
    progress,
    reload: () => setAttempt((a) => a + 1),
  };
}
