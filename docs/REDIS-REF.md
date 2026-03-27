# @upstash/redis — Reference

> HTTP-based Redis client. No persistent TCP connection — works anywhere fetch works (Cloudflare Workers, Bun, edge runtimes, etc).

---

## Setup

```ts
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: Bun.env.UPSTASH_REDIS_REST_URL!,
  token: Bun.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

Alternatively, if your env vars are named exactly `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, you can use:

```ts
const redis = Redis.fromEnv()
```

Credentials come from the Upstash Console → your database → REST API section.

---

## Strings — the base type

The most primitive data type. A key maps to a single value.

```ts
// set
await redis.set("planet:1", "mercury")

// get
const name = await redis.get("planet:1")
// "mercury"

// set with expiry (seconds)
await redis.set("planet:1", "mercury", { ex: 60 })

// set only if key doesn't exist
await redis.set("planet:1", "mercury", { nx: true })

// delete
await redis.del("planet:1")

// check existence
const exists = await redis.exists("planet:1")
// 1 (exists) or 0 (doesn't)

// increment (key must be a number string)
await redis.set("counter", 0)
await redis.incr("counter")   // 1
await redis.incrby("counter", 5) // 6
```

Objects are automatically serialized to JSON strings and deserialized on get:

```ts
await redis.set("planet:1", { name: "mercury", moons: 0 })
const planet = await redis.get<{ name: string; moons: number }>("planet:1")
// { name: "mercury", moons: 0 } — already parsed, no JSON.parse() needed
```

---

## Keys & Naming Convention

Redis has no folders or tables. The convention is `namespace:id`:

```
planet:1
planet:2
user:abc123
session:xyz
```

This is just a string — Redis doesn't enforce it, but it keeps things organized and makes pattern scanning possible.

---

## Hashes — object fields stored separately

A hash is a key that maps to a set of field-value pairs. Useful when you want to read or update individual fields without fetching the whole object.

```ts
// set fields
await redis.hset("star:sol", { type: "G-type", age: 4.6, planets: 8 })

// get one field
const type = await redis.hget("star:sol", "type")
// "G-type"

// get all fields
const star = await redis.hgetall("star:sol")
// { type: "G-type", age: 4.6, planets: 8 }

// delete a field
await redis.hdel("star:sol", "age")

// check if field exists
const has = await redis.hexists("star:sol", "type")
// 1 or 0
```

> For your use case: hashes are great when you want to update a single field (e.g. `status`) without rewriting the whole object. Strings with JSON are simpler but require a full read-modify-write cycle for updates.

---

## Lists — ordered, allows duplicates

```ts
// push to left (head)
await redis.lpush("queue:jobs", "job:3", "job:2", "job:1")

// push to right (tail)
await redis.rpush("queue:jobs", "job:4")

// read range (0 to -1 = all)
const jobs = await redis.lrange("queue:jobs", 0, -1)

// pop from left
const next = await redis.lpop("queue:jobs")

// length
const len = await redis.llen("queue:jobs")
```

---

## Sets — unordered, no duplicates

```ts
await redis.sadd("tags:post:1", "redis", "backend", "tutorial")

// check membership
const has = await redis.sismember("tags:post:1", "redis")
// 1 or 0

// get all members
const tags = await redis.smembers("tags:post:1")

// remove
await redis.srem("tags:post:1", "tutorial")

// count
const count = await redis.scard("tags:post:1")
```

---

## Sorted Sets — scored ordering

Members have a score. Redis keeps them sorted by score automatically.

```ts
await redis.zadd("leaderboard", { score: 9200, member: "alice" })
await redis.zadd("leaderboard", { score: 8800, member: "bob" })
await redis.zadd("leaderboard", { score: 9500, member: "charlie" })

// range by rank (lowest to highest)
const bottom = await redis.zrange("leaderboard", 0, -1)

// range by rank (highest to lowest)
const top = await redis.zrange("leaderboard", 0, -1, { rev: true })

// get a member's score
const score = await redis.zscore("leaderboard", "alice")

// rank (0-indexed)
const rank = await redis.zrank("leaderboard", "alice")
```

---

## Expiry — TTL management

```ts
// set TTL in seconds on existing key
await redis.expire("planet:1", 120)

// check remaining TTL
const ttl = await redis.ttl("planet:1")
// seconds remaining, -1 = no expiry, -2 = key doesn't exist

// remove expiry (make permanent)
await redis.persist("planet:1")
```

---

## Pipelining — batch multiple commands

Sends all commands in a single HTTP request instead of one per command. Use when you need to fire multiple independent commands.

```ts
const pipeline = redis.pipeline()

pipeline.set("planet:1", "mercury")
pipeline.set("planet:2", "venus")
pipeline.set("planet:3", "earth")
pipeline.get("planet:1")

const results = await pipeline.exec()
// results[3] === "mercury"
```

> No conditional logic inside a pipeline — commands are queued and fired all at once.

---

## Transactions — atomic batch

Like pipelining but atomic. Either all commands succeed or none do.

```ts
const tx = redis.multi()

tx.incr("seats:available")
tx.decr("seats:reserved")

await tx.exec()
```

---

## Scan — iterate keys by pattern

`keys()` works but blocks Redis while it runs (bad in production). Use `scan` instead.

```ts
// scan returns a cursor + partial results, keep scanning until cursor = 0
let cursor = 0
const found: string[] = []

do {
  const [nextCursor, keys] = await redis.scan(cursor, { match: "planet:*", count: 10 })
  cursor = nextCursor
  found.push(...keys)
} while (cursor !== 0)
```

---

## Type safety

The SDK is generic — tell it what shape to expect on `get` and `hgetall`:

```ts
type Planet = { name: string; moons: number }

const planet = await redis.get<Planet>("planet:1")
// typed as Planet | null

const all = await redis.hgetall<Planet>("planet:1")
// typed as Planet | null
```

Returns `null` if the key doesn't exist — always handle it.

---

## Error handling

The SDK throws on failure (unlike the old v0 which returned `{ data, error }`):

```ts
try {
  const planet = await redis.get<Planet>("planet:1")
  if (!planet) {
    // key doesn't exist — not an error, just null
  }
} catch (err) {
  // actual Redis/network failure
}
```

---

## What you won't need (for now)

| Feature | What it is | Skip because |
|---|---|---|
| `@upstash/query` | Secondary indices on Redis data | Overkill for CRUD |
| Pub/Sub | Real-time messaging | Not REST-compatible with this SDK |
| Lua scripts | Server-side scripting | Advanced use case |
| Geospatial | `geoadd`, `geodist`, etc. | Not relevant here |
