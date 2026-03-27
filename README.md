# task-api

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tgr-wjya/task-api/ci.yml)
[![codecov](https://codecov.io/gh/tgr-wjya/task-api/branch/prod/graph/badge.svg?token=uMNQ5hGc45)](https://codecov.io/gh/tgr-wjya/task-api)

### 27 March 2026

> reformating my elysia task api using hono

migrating from elysia to hono. this project is to help familiarize myself with hono syntaxes. as well as to reiterate on the previous [elysia-challenge](https://github.com/tgr-wjya/elysia-challenge) project.

don't get me wrong, i'm comfortable and love using elysia, but i don't want to overcommit to the framework considering that its pretty niche after all

i'll still be using bun, as its perfect for me.

## explore

- [task-api](#task-api)
  - [live url](#live-url)
  - [endpoints](#endpoints)
  - [what i learned from hono](#what-i-learned-from-hono)
  - [stack](#stack)
  - [find me](#find-me)

## live url

check the api here: [task-api](https://hono-mastery-production.up.railway.app/)

## openapi docs

> currently working on wiring up `@hono/zod-openapi` + `@hono/swagger-ui`
it's not as plug-and-play as elysia's built-in swagger. in the meantime, check the [.http](.http) file for raw request references or see the docs below

`status` accepts: `"pending"` · `"in-progress"` · `"completed"`

## endpoints

| method | what it does | body |
| --- | --- | --- |
| `GET  /tasks/all` | return all tasks | — |
| `POST /tasks` | create a task | `title: string`, `status?: enum` |
| `GET  /tasks/:id` | return task by `id` | — |
| `PATCH  /tasks/:id` | update task | `title?: string`, `status?: enum` |
| `DELETE  /tasks/:id` | delete task | — |

## what i learned from hono

- unlike elysia which is a server instance, hono itself implements the Web Fetch API interface
- hono requires you to expose the handler through `fetch` as for elysia, its all handled by `.listen()`

- ```ts
    Bun.serve({
    port: Number(Bun.env.PORT ?? 3000),
    hostname: "0.0.0.0",
    fetch: app.fetch,
  });
  ```

- everything in hono is explicit by design, for example:
  - you need to specify the type of response from the server, whereas elysia handles it for you unless explicitly stated:

  ```ts
  // with hono
  app.get("/", (c) => {
    return c.text("Hello Hono!"); // needs an explicit response object
  });

  // with elysia
  .get("/", () => {
    "Hello, Elysia!"; // will auto-converts return values
  })
  ```

  - hono by design is agnostic and minimal framework, you need to opt into validation (e.g. zod, valibot, etc.) to get the same **built-in parsing + typing + schema integration** that elysia has.

- hooks works a bit differently in hono. everything lives under `(c)` as a (single context object). elysia give you a destructured context

  - ```ts
      // with hono
      app.post('/user', tbValidator('json', Body), (c) => {
        const { name } = c.req.valid('json')
        return c.json({ name })
      })

      // with elysia
      .get('/all', async ({ set }) => {
          set.status = 200;
          return await getTasks();
      })
    ```

- hono exposes a fetch-compatible handler, so you can call it directly in tests

  - ```ts
      // bun test runner with hono:
      const res = await app.request("/"); // you only need to specify the path without manually specifying the baseUrl

      const hello = await res.text();
      expect(hello).toBe("Hello Hono!");

      // bun test runner with elysia:
      const res = await app.handle(new Request(`${BASE_URL}`)); // no more explicit BASE_URL const at your test runner

      const hello = await res.text();
      expect(hello).toBe("Hello Hono!");
    ```

- so far, the `function` and `routing` behave the same way in hono. 
- you could use `safeParse` for your incoming request, be it `POST`, or even `DELETE`. using it is simple too, you can do this:

- ```ts
  app.get("/:id", zValidator("param", TaskIdSchema), (c) => {
		const { id } = c.req.valid("param");
		TaskIdSchema.safeParse(id);

		return c.json(service.getById(id), 200);
	});
  ```

  - zod will validate incoming req params.
- i haven't bother putting zod validation error in the test runner but i plan on doing so later.
- with zod, you can assert specific schema field, if you for some reason need a type-checking for one of your schema. 
- for example, instead of creating a separate schema, you should do this instead:

- ```ts
  export const FullTaskSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(4),
	status: z.enum(["completed", "pending", "in-progress"]).optional(),
	createdAt: z.string().min(1),
  });

  export type Task = z.Infer<typeof FullTaskSchema>;
  export type Status = z.Infer<typeof FullTaskSchema>["status"];
  ```

- and it'll work the same way as if you've created a separate schema for said field.
- btw, `z.Infer` is the new canonical form for Zod v4. easy to miss since the old v3 used a lowercase `z.infer`.
- i tried using refreshable `app` instance for my test runner but the problem is that your `onError` doesn't come along with it.
- be wary that creating a new `Hono()` instance and mounting `TaskRoutes(service)` on it, would completely bypass your `app.ts`. 
- your instance would have no `onError` because you never gave it one. its a new and separate hono instance after all.

- ```ts
  // test creates a bare Hono instance — onError not inherited
  beforeEach(() => {
		service = new TaskService();
		testApp = new Hono();
		testApp.route("/tasks", TaskRoutes(service)); // still no onError
  });
  ```

- so you must force feed the onError at your `beforeEach()`.

- ```ts
  beforeEach(() => {
		service = new TaskService();
		testApp = new Hono();
		testApp.route("/tasks", TaskRoutes(service));

		testApp.onError((err, c) => {
			if (err instanceof TaskNotFound) {
				return c.json(
					{
						error: err instanceof Error ? err.message : "Unknown Error",
						timestamp: new Date().toISOString(),
					},
					404,
				);
			}

			return c.json(
				{
					error: err instanceof Error ? err.message : "Unknown Error",
					timestamp: new Date().toISOString(),
				},
				500,
			);
		});
	});
  ```

- when you isolate the router in tests with a fresh Hono instance for dependency injection, you also lose the global error handler
- even though, hono automatically inject your global `onError` to your subroutes just fine.
- this is a specific problem and i'd likely be fixing it later.

## stack

bun + hono + an in-array memory

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

made with ◉‿◉
