import { createClient } from "redis";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import type { CacheStore } from "./query-cache";
const compress = promisify(gzip),
  decompress = promisify(gunzip);
function newClient(url: string) {
  return createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 1500,
      reconnectStrategy: false,
    },
  });
}
let client: ReturnType<typeof newClient> | undefined;
let connecting: Promise<ReturnType<typeof newClient> | null> | undefined;
let retryAfter = 0;
async function connection() {
  if (!process.env.REDIS_URL || Date.now() < retryAfter) return null;
  if (client?.isReady) return client;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      if (client?.isOpen) client.destroy();
      const next = newClient(process.env.REDIS_URL!);
      next.on("error", () => {
        retryAfter = Date.now() + 30000;
      });
      client = next;
      await next.connect();
      return next;
    } catch {
      retryAfter = Date.now() + 30000;
      return null;
    } finally {
      connecting = undefined;
    }
  })();
  return connecting;
}
export const redisStore: CacheStore = {
  async get(key) {
    const redis = await connection();
    if (!redis) return null;
    const stored = await redis.withCommandOptions({ timeout: 2000 }).get(key);
    return stored
      ? (
          await decompress(Buffer.from(stored, "base64"), {
            maxOutputLength: 256 * 1024 * 1024,
          })
        ).toString("utf8")
      : null;
  },
  async set(key, value, ttl) {
    const redis = await connection();
    if (!redis) return;
    const zipped = await compress(value);
    if (zipped.length > 16 * 1024 * 1024) return;
    await redis
      .withCommandOptions({ timeout: 2000 })
      .set(key, zipped.toString("base64"), { EX: ttl });
  },
};

export function closeRedis() {
  if (client?.isOpen) client.destroy();
  client = undefined;
  connecting = undefined;
  retryAfter = 0;
}
