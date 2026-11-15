"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Detection } from "@/lib/llamita/data";
import type { Bbox } from "@/lib/geo/catalog";
import { geographicMapSnapshot, geographicSnapshot } from "@/lib/geo/snapshot";
export function ReportMap({ data, bbox }: { data: Detection[]; bbox: Bbox }) {
  const key = bbox.join(",");
  const [result, setResult] = useState<{
    data: Detection[];
    key: string;
    svg: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const extent = key.split(",").map(Number) as Bbox;
    void geographicMapSnapshot(data, extent).then((svg) => {
      if (active) setResult({ data, key, svg });
    });
    return () => {
      active = false;
    };
  }, [data, key]);
  const svg =
    result?.data === data && result.key === key
      ? result.svg
      : geographicSnapshot(data, bbox);
  return (
    <Image
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      width={900}
      height={380}
      unoptimized
      alt="Mapa geográfico del área seleccionada con los focos de calor de NASA FIRMS"
      className="real-report-map"
    />
  );
}
