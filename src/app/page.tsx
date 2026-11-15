import { MapView } from "@/components/map-view";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ foco?: string }>;
}) {
  const { foco } = await searchParams;
  return <MapView key={foco || "map"} initialFocus={foco} />;
}
