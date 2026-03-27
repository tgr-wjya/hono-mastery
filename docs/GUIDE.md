# task-api — Project Guide

> Goal: learn Hono. Zod is here for validation. Redis is gone. In-memory storage so you stay focused on the framework, not the database.

---

## The Task model

```ts
type Task = {
  id: string        // UUID — generated on creation, never changes
  title: string     // required, non-empty
  status: "pending" | "in-progress" | "completed"
  createdAt: string // ISO 8601 — set on creation, never changes
}
```

---

## In-memory storage

One file, one Map. That's your entire "database."

```ts
// src/lib/store.ts
import type { Task } from "../tasks/schema"

export const store = new Map<string, Task>()
```

| Operation | Map call |
|---|---|
| Get all tasks | `[...store.values()]` |
| Get one task | `store.get(id)` → returns `Task` or `undefined` |
| Create | `store.set(task.id, task)` |
| Update | `store.set(id, { ...existing, ...changes })` |
| Delete | `store.delete(id)` |

No async, no network, no null vs undefined confusion. If `store.get(id)` returns `undefined`, the task doesn't exist — throw `NotFoundException`.

---

## Zod schemas

Three schemas in `src/tasks/schema.ts`:

| Schema | Used for | Fields |
|---|---|---|
| `TaskSchema` | Typing a full task | `id`, `title`, `status`, `createdAt` |
| `CreateTaskBodySchema` | Validating `POST` body | `title` only |
| `UpdateTaskBodySchema` | Validating `PATCH` body | `title?`, `status?` — at least one required |

Syntax reference for things you'll actually use:

```ts
// unrelated "book" example
const BookSchema = z.object({
  title: z.string().min(1),             // non-empty string
  genre: z.enum(["fiction", "sci-fi"])  // fixed set of values
})

// partial update — at least one field must be present
const UpdateBookSchema = z.object({
  title: z.string().min(1).optional(),
  genre: z.enum(["fiction", "sci-fi"]).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "At least one field must be provided" }
)
```

---

## How `@hono/zod-validator` fits in

It's middleware — it goes between the path and your handler. If validation fails it auto-returns `400`, you don't handle it yourself.

```ts
// unrelated "product" example
import { zValidator } from "@hono/zod-validator"

router.post("/products", zValidator("json", CreateProductSchema), (c) => {
  const body = c.req.valid("json") // fully typed, already validated
  // ...
})
```

---

## File structure

```
src/
  app.ts          ← already exists — register task router here
  server.ts       ← already exists — don't touch
  errors/
    error.ts      ← already exists
  lib/
    store.ts      ← the Map lives here
  tasks/
    router.ts     ← 5 routes
    service.ts    ← all store logic (getTask, createTask, etc.)
    schema.ts     ← Zod schemas + Task type
  types.ts        ← already exists
```

Same rule as before: router calls service, service talks to the store. Keeps things clean.

---

## Endpoint breakdown

### `GET /tasks/all`
- `[...store.values()]` → return array
- Always `200`, even if empty — empty array is not a 404

### `POST /tasks`
1. Validate body (`title`)
2. `crypto.randomUUID()` for the id — built into Bun, no import
3. Build task: id + title + `status: "pending"` + `createdAt: new Date().toISOString()`
4. `store.set(task.id, task)`
5. Return `201` with the created task

### `GET /tasks/:id`
- `store.get(id)` → `undefined`? throw `NotFoundException` → else return `200`

### `PATCH /tasks/:id`
1. Validate body
2. `store.get(id)` → 404 if missing
3. `store.set(id, { ...existing, ...body })`
4. Return `200` with updated task
- Don't let `id` or `createdAt` be overwritable — only spread the fields you allow

### `DELETE /tasks/:id`
1. `store.get(id)` → 404 if missing
2. `store.delete(id)`
3. Return `200` with `{ message: "Task deleted" }` or `204` with no body — pick one, stay consistent

---

## Register the router in app.ts

```ts
import { taskRouter } from "./tasks/router"

app.route("/tasks", taskRouter)
```

Hono strips the prefix automatically — inside `taskRouter`, your routes are `/all`, `/:id`, etc.

---

## One bug to fix before you start

In `src/types.ts`:

```ts
// wrong — this is a task status enum, not a timestamp type
timestamp: z.enum(["completed", "in-progress", "pending"])

// fix it
timestamp: z.string()
```

---

## Railway deployment

Railway runs your Docker container as-is. Your `Dockerfile` is already correct. You just need two things:

**1. Set the `PORT` env var in Railway**

Go to your service → Variables → add `PORT=3000`. Railway also injects its own `PORT` automatically, so your existing code (`Bun.env.PORT ?? 3000`) already handles it.

**2. Fix the entrypoint in your Dockerfile**

Your Dockerfile currently runs `bun src/app.ts` — that's wrong. `app.ts` only exports the Hono instance, it doesn't call `Bun.serve()`. Fix it:

```dockerfile
CMD ["bun", "src/server.ts"]
```

That's it. Push to your connected repo, Railway builds and deploys automatically.

> In-memory data resets on every redeploy or crash. Fine for learning — just know it's not persistent.

---

## Where to start

1. `src/lib/store.ts` — the Map, 3 lines
2. `src/tasks/schema.ts` — three Zod schemas
3. `src/tasks/service.ts` — `createTask` and `getTask` first
4. `src/tasks/router.ts` — `POST /tasks` and `GET /tasks/:id` first, test, then the rest
5. `src/app.ts` — `app.route("/tasks", taskRouter)`
6. Fix the `CMD` in your Dockerfile before deploying
