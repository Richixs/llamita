import { MapScreen } from "@/components/map-screen";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ foco?: string }>;
}) {
  const { foco } = await searchParams;
  return <MapScreen key={foco || "map"} initialFocus={foco} />;
}
