# task-api

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/tgr-wjya/hono-mastery/ci.yml)
[![codecov](https://codecov.io/gh/tgr-wjya/hono-mastery/branch/prod/graph/badge.svg?token=uMNQ5hGc45)](https://codecov.io/gh/tgr-wjya/hono-mastery)

### 25 march 2026

> reformating my elysia task api using hono and added persistence with redis

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

## endpoints

| method | what it does |
| ------------- | ----------------------------------------------------------------------------- |
| `GET  /tasks/all` | return all tasks from redis |
| `POST /tasks` | write task to redis |
| `GET  /tasks/:id` | return task by its `id` |
| `PATCH  /tasks/:id` | update task |
| `DELETE  /tasks/:id` | delete task |

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
    "Hello, World"; // will auto-converts return values
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

## stack

bun + hono + @upstash/redis

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

made with ◉‿◉
