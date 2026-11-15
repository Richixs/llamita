"use client";
import { useEffect, useState } from "react";
import type { HotspotResult } from "@/lib/firms/query";
import type { Bbox } from "@/lib/geo/catalog";
import { MAX_QUERY_DAYS } from "@/lib/geo/catalog";
import { periodError } from "@/lib/llamita/filters";
export function livePeriodError(from: string, to: string) {
  return (
    periodError(from, to) ||
    ((Date.parse(to) - Date.parse(from)) / 86400000 >= MAX_QUERY_DAYS
      ? `Las consultas reales admiten hasta ${MAX_QUERY_DAYS} días.`
      : "")
  );
}
export async function fetchLiveDetections(
  from: string,
  to: string,
  sensor: string,
  bbox: Bbox,
  signal?: AbortSignal,
): Promise<HotspotResult> {
  const params = new URLSearchParams({
    from,
    to,
    sensor,
    bbox: bbox.join(","),
  });
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
  return body;
}
export function useLiveDetections({
  from,
  to,
  sensor,
  bbox,
  enabled = true,
}: {
  from: string;
  to: string;
  sensor: string;
  bbox: Bbox;
  enabled?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const query = new URLSearchParams({
    from,
    to,
    sensor,
    bbox: bbox.join(","),
  }).toString();
  const requestKey = `${query}#${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    value?: HotspotResult;
    error?: string;
  }>({ key: "" });
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
    reload: () => setAttempt((a) => a + 1),
  };
}
