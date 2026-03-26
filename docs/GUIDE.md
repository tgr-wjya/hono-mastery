# task-api — Project Guide

> This doc is NOT a generic Hono/Zod/Redis reference. It's specifically about what to build, what shape the data takes, how Redis stores it, and what each endpoint is supposed to do in this project.

---

## The Task model

Before writing a single route, you need to decide what a "task" looks like. Here's the shape to work with:

```ts
type Task = {
  id: string        // UUID — generated on creation, never changes
  title: string     // required, non-empty
  status: "pending" | "in-progress" | "completed"
  createdAt: string // ISO 8601 datetime string — set on creation, never changes
}
```

This is the canonical shape. Everything — your Zod schema, your Redis storage, your response bodies — should derive from this.

---

## How Redis stores tasks in this project

Redis has no tables. You're going to fake one using two conventions:

### 1. Individual task → JSON string at `task:{id}`

```
task:abc123  →  { "id": "abc123", "title": "Buy milk", "status": "pending", "createdAt": "..." }
task:def456  →  { "id": "def456", "title": "Fix bug", "status": "in-progress", "createdAt": "..." }
```

Use `redis.set("task:abc123", taskObject)` to write.  
Use `redis.get<Task>("task:abc123")` to read. No `JSON.parse()` needed — the SDK handles it.

### 2. All task IDs → a Redis Set at `tasks`

A Redis Set is an unordered collection of unique strings. You'll use it as an index of every task ID that exists.

```
tasks  →  { "abc123", "def456", "ghi789" }
```

- When you **create** a task: `sadd("tasks", newId)`
- When you **delete** a task: `srem("tasks", id)`
- When you **get all**: `smembers("tasks")` → gives you all IDs → then fetch each one

> **Why not just scan for `task:*` keys?** Because `scan` is async, cursor-based, and harder to work with. The ID set is simpler and predictable.

---

## File structure to aim for

```
src/
  app.ts          ← already exists — wire up your task router here
  server.ts       ← already exists — don't touch
  errors/
    error.ts      ← already exists
  tasks/
    router.ts     ← Hono router with all 5 task routes
    service.ts    ← all Redis logic lives here (getTasks, getTask, createTask, etc.)
    schema.ts     ← Zod schemas for Task, CreateTaskBody, UpdateTaskBody
  lib/
    redis.ts      ← Redis client instance (Redis.fromEnv())
  types.ts        ← already exists
```

Keep Redis calls out of `router.ts`. Route handlers call service functions; service functions talk to Redis. This way your tests can eventually mock the service layer.

---

## Zod schemas you'll need

Three schemas, each with a specific job:

| Schema | Used for | Fields |
|---|---|---|
| `TaskSchema` | Validating/typing a full task from Redis | `id`, `title`, `status`, `createdAt` |
| `CreateTaskBodySchema` | Validating POST request body | `title` only (id and createdAt are generated; status defaults to `"pending"`) |
| `UpdateTaskBodySchema` | Validating PATCH request body | `title?`, `status?` — both optional, but at least one should be present |

Zod tip for a string that can't be empty:

```ts
// imagine a "book" model, not your task model
const BookSchema = z.object({
  title: z.string().min(1),
  genre: z.enum(["fiction", "non-fiction", "sci-fi"])
})
```

For an object where at least one field must be present (useful for PATCH):

```ts
// again, unrelated example
const UpdateBookSchema = z.object({
  title: z.string().min(1).optional(),
  genre: z.enum(["fiction", "non-fiction"]).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "At least one field must be provided" }
)
```

---

## Endpoint breakdown

### `GET /tasks/all`

- **What it does:** Returns every task in Redis.
- **Flow:** `smembers("tasks")` → array of IDs → fetch each with `redis.get<Task>("task:{id}")` → filter out any nulls → return array.
- **Response:** `200` with `Task[]`. Empty array if none exist — not a 404.
- **Watch out for:** `smembers` returns `[]` when the set doesn't exist yet, not null. Safe to call on first run.

---

### `POST /tasks`

- **What it does:** Creates a new task.
- **Request body:** `{ title: string }`
- **Flow:**
  1. Validate body with Zod via `@hono/zod-validator`
  2. Generate a UUID: `crypto.randomUUID()` — built into Bun, no import needed
  3. Build the task object: id + title + `status: "pending"` + `createdAt: new Date().toISOString()`
  4. `redis.set("task:{id}", taskObject)`
  5. `redis.sadd("tasks", id)`
  6. Return the created task
- **Response:** `201` with the full `Task` object.

---

### `GET /tasks/:id`

- **What it does:** Returns a single task by ID.
- **Flow:** `redis.get<Task>("task:{id}")` → if null, throw `NotFoundException` (already built!) → else return task.
- **Response:** `200` with `Task`, or `404` if not found.

---

### `PATCH /tasks/:id`

- **What it does:** Partially updates a task.
- **Request body:** `{ title?: string, status?: "pending" | "in-progress" | "completed" }` — at least one field.
- **Flow:**
  1. Validate body
  2. Fetch existing task — 404 if not found
  3. Merge: `{ ...existing, ...body }` — this is the "read-modify-write" cycle mentioned in the Redis ref
  4. `redis.set("task:{id}", mergedTask)` — overwrites the old value
  5. Return the updated task
- **Response:** `200` with updated `Task`.
- **Watch out for:** Don't let `id` or `createdAt` be overwritten via the body. Merge only the fields you explicitly allow.

---

### `DELETE /tasks/:id`

- **What it does:** Deletes a task.
- **Flow:**
  1. Check if task exists — 404 if not
  2. `redis.del("task:{id}")`
  3. `redis.srem("tasks", id)`
  4. Return a confirmation
- **Response:** `200` with `{ message: "Task deleted" }` (or `204` with no body — your call, just be consistent).

---

## How `@hono/zod-validator` fits in

You've got `@hono/zod-openapi` in your deps but you can use the simpler `@hono/zod-validator` for now (it's a dependency of zod-openapi, so it's already installed).

It goes in as a **middleware argument** on the route, before your handler:

```ts
// unrelated example — a "product" route, not your task route
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"

const CreateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

router.post("/products", zValidator("json", CreateProductSchema), (c) => {
  const body = c.req.valid("json") // fully typed here
  // ...
})
```

If validation fails, it automatically returns a `400` with error details. You don't handle that yourself.

---

## One bug to fix before you start

In `src/types.ts`, `AllErrorSchema` has this:

```ts
timestamp: z.enum(["completed", "in-progress", "pending"])
```

That's a task status enum, not a timestamp. Should be `z.string()`. It won't blow up at runtime (the schema isn't validated on the way out, only used for typing), but it's a lie in your type definition.

---

## Where to start

**In this order:**

1. `src/lib/redis.ts` — just the Redis client instance, 3 lines
2. `src/tasks/schema.ts` — `TaskSchema`, `CreateTaskBodySchema`, `UpdateTaskBodySchema`
3. `src/tasks/service.ts` — one function at a time, starting with `createTask` and `getTask`
4. `src/tasks/router.ts` — wire up `POST /tasks` and `GET /tasks/:id` first, test them, then do the rest
5. Register the task router in `src/app.ts` with `app.route("/tasks", taskRouter)`