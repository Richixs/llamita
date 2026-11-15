import test from "node:test";
import assert from "node:assert/strict";
import { buildGamcRequest, GamcError, proxyGamc } from "../src/lib/gamc/proxy";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function wms(extra: Record<string, string> = {}) {
  return new URLSearchParams({
    layer: "periurbanos",
    REQUEST: "GetMap",
    SRS: "EPSG:3857",
    BBOX: "-7364284,-1966770,-7363284,-1965770",
    WIDTH: "256",
    HEIGHT: "256",
    ...extra,
  });
}
test("the municipal proxy pins layer IDs and WMS parameters", () => {
  const request = buildGamcRequest(wms(), "private-test-key");
  assert.equal(request.url.hostname, "serviciosgamc.cochabamba.bo");
  assert.equal(
    request.url.searchParams.get("service_id"),
    "c52066a1-32fd-4925-81e0-c2dcb8f4238f",
  );
  assert.equal(request.url.searchParams.get("LAYERS"), "");
  assert.equal(request.url.searchParams.get("VERSION"), "1.1.1");
  assert.equal(request.url.searchParams.has("STYLES"), false);
  const legend = buildGamcRequest(
    new URLSearchParams({
      layer: "cota-2750",
      REQUEST: "GetLegendGraphic",
      VERSION: "1.0.0",
    }),
    "key",
  );
  assert.equal(legend.url.searchParams.has("BBOX"), false);
});
test("the municipal proxy rejects unauthorized operations and injected parameters", () => {
  const injected: Record<string, string>[] = [
    { layer: "other" },
    { REQUEST: "GetCapabilities" },
    { LAYERS: "secret" },
    { CQL_FILTER: "INCLUDE" },
    { service_id: "other" },
    { STYLES: "custom" },
    { WIDTH: "5000" },
    { BBOX: "NaN,1,2,3" },
    { key: "caller-key" },
  ];
  for (const extra of injected)
    assert.throws(() => buildGamcRequest(wms(extra), "server-key"), GamcError);
  assert.throws(() =>
    buildGamcRequest(
      wms({ REQUEST: "GetFeatureInfo", X: "256", Y: "0" }),
      "key",
    ),
  );
});
test("GAMC validates actual response formats and keeps its key server-side", async (t) => {
  const original = globalThis.fetch,
    key = process.env.GAMC_API_KEY;
  process.env.GAMC_API_KEY = "private-test-key";
  t.after(() => {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.GAMC_API_KEY;
    else process.env.GAMC_API_KEY = key;
  });
  globalThis.fetch = async () =>
    new Response("<ServiceException>private-test-key</ServiceException>");
  await assert.rejects(
    proxyGamc(wms()),
    (e) =>
      e instanceof Error &&
      !e.message.includes("private-test-key") &&
      e.message.includes("PNG"),
  );
  globalThis.fetch = async () => new Response(png);
  const response = await proxyGamc(wms());
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.has("key"), false);
  globalThis.fetch = async () =>
    Response.json({ type: "FeatureCollection", features: [] });
  const info = await proxyGamc(
    wms({ REQUEST: "GetFeatureInfo", X: "12", Y: "10" }),
  );
  assert.deepEqual(await info.json(), {
    type: "FeatureCollection",
    features: [],
  });
  delete process.env.GAMC_API_KEY;
  await assert.rejects(
    proxyGamc(wms()),
    (e) => e instanceof GamcError && e.status === 503,
  );
});
