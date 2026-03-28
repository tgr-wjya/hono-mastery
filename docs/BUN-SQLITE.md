# bun:sqlite — Reference

> No install. No driver. It's built into Bun. `import { Database } from "bun:sqlite"` and you're done.

---

## File DB vs `:memory:` — know which one to use

```ts
// persists to disk — use this in dev and prod
const db = new Database("tasks.db")

// lives and dies with the connection — use this in tests
const db = new Database(":memory:")
```

File DB is what you actually want for your project. The file gets created automatically on first open if it doesn't exist.

`:memory:` is for tests only. The reason: every `new Database(":memory:")` you open is a completely isolated, blank database. The moment you close it (or the test process ends), it's gone. No cleanup, no leftover rows bleeding between tests. If you used a file in tests, you'd have to manually `DELETE FROM tasks` in every `beforeEach`, and you'd still be sharing state between parallel runs.

---

## Opening and closing

```ts
import { Database } from "bun:sqlite"

const db = new Database("library.db")

// explicit close — important in tests, optional in long-running servers
db.close()
```

For a server process you typically open once at startup and never close. For tests, close in `afterEach` or `afterAll`.

WAL mode is worth enabling immediately after opening — it makes concurrent reads faster and doesn't block writes:

```ts
db.exec("PRAGMA journal_mode = WAL")
```

---

## Schema creation on startup

Run this once when your server boots, before any routes are registered. `IF NOT EXISTS` means it's safe to call every time.

```ts
// unrelated example — books, not tasks
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    published_at TEXT NOT NULL
  )
`)
```

SQLite types are loose. In practice you only need: `TEXT`, `INTEGER`, `REAL`, `BLOB`. Store UUIDs and ISO dates as `TEXT`.

---

## The four ways to run SQL

```ts
// exec — DDL and one-off statements, returns nothing
db.exec("DROP TABLE IF EXISTS books")

// prepare — returns a Statement you can call multiple times
const stmt = db.prepare("SELECT * FROM books WHERE author = ?")

// query — shorthand for prepare + immediate call, returns rows
const rows = db.query("SELECT * FROM books").all()

// run — for INSERT / UPDATE / DELETE, returns metadata
const result = db.prepare("DELETE FROM books WHERE id = ?").run("abc")
result.changes  // number of rows affected
result.lastInsertRowid  // bigint — useful after INSERT
```

`prepare` is what you want in a service class. Prepare once (in the constructor), call many times. It's faster than re-parsing SQL on every request.

---

## Prepared statements — the pattern you'll actually use

```ts
// unrelated example — a catalog service
class CatalogService {
  private db: Database
  private getBySlug: Statement
  private insert: Statement

  constructor(db: Database) {
    this.db = db
    this.getBySlug = db.prepare("SELECT * FROM books WHERE slug = $slug")
    this.insert = db.prepare(
      "INSERT INTO books (id, title, slug) VALUES ($id, $title, $slug)"
    )
  }

  find(slug: string) {
    return this.getBySlug.get({ $slug: slug })
  }

  create(id: string, title: string, slug: string) {
    this.insert.run({ $id: id, $title: title, $slug: slug })
  }
}
```

Named params (`$name`) are clearer than positional (`?`) once you have more than two. Both work.

---

## Reading rows

```ts
const stmt = db.prepare("SELECT * FROM books WHERE author = $author")

// one row or null
const book = stmt.get({ $author: "Ursula K. Le Guin" })

// all matching rows
const books = stmt.all({ $author: "Ursula K. Le Guin" })

// array of arrays instead of objects — faster, less ergonomic
const raw = stmt.values({ $author: "Ursula K. Le Guin" })
// [[id, title, author, published_at], ...]
```

`get` returns `null` if nothing matches. `all` returns `[]`. Neither throws.

---

## Typing the results

`bun:sqlite` returns plain objects typed as `unknown` by default. Pass a generic:

```ts
type Book = {
  id: string
  title: string
  author: string
  published_at: string
}

const stmt = db.prepare<Book, { $author: string }>(
  "SELECT * FROM books WHERE author = $author"
)

const book = stmt.get({ $author: "Borges" })
// typed as Book | null
```

The second generic is the param shape. Optional but catches typos at compile time.

---

## Transactions

When you need multiple writes to succeed or fail together:

```ts
// unrelated example — moving inventory between warehouses
const transfer = db.transaction((fromId: string, toId: string, qty: number) => {
  db.prepare("UPDATE inventory SET qty = qty - ? WHERE id = ?").run(qty, fromId)
  db.prepare("UPDATE inventory SET qty = qty + ? WHERE id = ?").run(qty, toId)
})

transfer("warehouse-a", "warehouse-b", 50)
```

If anything throws inside the transaction function, the whole thing rolls back automatically. No manual `ROLLBACK` needed.

---

## UPDATE pattern — partial updates

SQLite has no `PATCH`. You either update specific columns explicitly or use `COALESCE` to skip nulls:

```ts
// explicit — only update what you pass
db.prepare(`
  UPDATE books SET title = $title WHERE id = $id
`).run({ $title: newTitle, $id: id })

// coalesce — keep existing value if param is null
db.prepare(`
  UPDATE books
  SET
    title = COALESCE($title, title),
    author = COALESCE($author, author)
  WHERE id = $id
`).run({ $title: maybeTitle ?? null, $author: maybeAuthor ?? null, $id: id })
```

The `COALESCE` approach maps cleanly to a PATCH endpoint where any field is optional.

---

## Test isolation setup

```ts
import { beforeEach, afterEach } from "bun:test"
import { Database } from "bun:sqlite"

let db: Database

beforeEach(() => {
  db = new Database(":memory:")
  db.exec(`
    CREATE TABLE books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL
    )
  `)
  // pass db into your service here
})

afterEach(() => {
  db.close()
})
```

Each test gets a brand new empty database. No shared state between tests. The service receives the db instance — it doesn't construct it internally.

---

## What you won't need yet

| Feature | Skip because |
|---|---|
| `db.serialize()` / `db.deserialize()` | In-memory snapshot/restore — overkill for CRUD |
| `ATTACH DATABASE` | Multi-file databases — not relevant |
| Custom functions (`db.function()`) | Extending SQLite with JS — advanced |
| `db.loadExtension()` | Loading native extensions — out of scope |
| Strict mode (`PRAGMA strict = ON`) | Worth knowing eventually, not now |
