import test from "node:test";
import assert from "node:assert/strict";
import {
  createQueryCache,
  type CacheStore,
} from "../src/lib/cache/query-cache";
test("shared cache avoids FIRMS calls across separate process caches", async () => {
  const values = new Map<string, string>();
  const store: CacheStore = {
    get: async (k) => values.get(k) || null,
    set: async (k, v, ttl) => {
      assert.equal(ttl, 300);
      values.set(k, v);
    },
  };
  let calls = 0;
  const load = async () => ({ detections: ++calls });
  const first = createQueryCache({ store }),
    second = createQueryCache({ store });
  assert.deepEqual(await first("shared", load), { detections: 1 });
  assert.deepEqual(await second("shared", load), { detections: 1 });
  assert.equal(calls, 1);
});
test("unavailable Redis falls back, coalesces calls and expires cached values", async () => {
  let now = 0,
    calls = 0;
  const cached = createQueryCache<number>({
    ttl: 1,
    now: () => now,
    store: {
      get: async () => {
        throw Error("offline");
      },
      set: async () => {
        throw Error("offline");
      },
    },
  });
  const values = await Promise.all([
    cached("key", async () => ++calls),
    cached("key", async () => ++calls),
  ]);
  assert.deepEqual(values, [1, 1]);
  now = 1001;
  assert.equal(await cached("key", async () => ++calls), 2);
});
test("failed requests and oversized results are never retained in local cache", async () => {
  const cached = createQueryCache<string>({ maxBytes: 4 });
  await assert.rejects(
    cached("bad", async () => {
      throw Error("FIRMS offline");
    }),
  );
  assert.equal(await cached("bad", async () => "ok"), "ok");
  let calls = 0;
  const load = async () => {
    calls++;
    return "large value";
  };
  await cached("big", load);
  await cached("big", load);
  assert.equal(calls, 2);
});

test(
  "Redis stores compressed values with TTL and shares them across caches",
  { skip: !process.env.TEST_REDIS_URL },
  async (t) => {
    const previous = process.env.REDIS_URL;
    process.env.REDIS_URL = process.env.TEST_REDIS_URL;
    const { redisStore, closeRedis } = await import("../src/lib/cache/redis");
    t.after(() => {
      closeRedis();
      if (previous === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = previous;
    });
    const key = `llamita:test:${Date.now()}`;
    await redisStore.set(key, JSON.stringify({ value: "shared" }), 1);
    assert.deepEqual(JSON.parse((await redisStore.get(key))!), {
      value: "shared",
    });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(await redisStore.get(key), null);
  },
);
