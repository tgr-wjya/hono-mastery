# Zod v4 — Reference

> You're on Zod v4 (`^4.3.6`). Some APIs changed from v3 — this doc reflects v4 only.

---

## Why Zod over plain interfaces

| | Interface | Zod Schema |
|---|---|---|
| Compile-time type | ✓ | ✓ (via `z.infer`) |
| Runtime validation | ✗ | ✓ |
| Transformation | ✗ | ✓ |
| Error messages | ✗ | ✓ |
| Reusability (pick, omit, partial) | limited | ✓ |

---

## Primitives

```ts
z.string()
z.number()
z.boolean()
z.bigint()
z.date()
z.undefined()
z.null()
z.unknown()   // accepts anything, no narrowing
z.any()       // accepts anything, disables type checking
z.never()     // accepts nothing
z.void()
```

---

## Type inference

```ts
const PlanetSchema = z.object({
  name: z.string(),
  moons: z.number(),
})

type Planet = z.infer<typeof PlanetSchema>
// { name: string; moons: number }
```

The schema is the source of truth. The type is derived from it, never the other way.

---

## Strings

```ts
z.string().min(3)
z.string().max(100)
z.string().length(8)          // exact length
z.string().email()
z.string().url()
z.string().uuid()
z.string().regex(/^[a-z]+$/)
z.string().startsWith("prefix_")
z.string().endsWith("_suffix")
z.string().includes("keyword")
z.string().trim()             // trims before validation
z.string().toLowerCase()
z.string().toUpperCase()
z.string().nonempty()         // shorthand for .min(1)
```

---

## Numbers

```ts
z.number().min(0)
z.number().max(100)
z.number().positive()         // > 0
z.number().negative()         // < 0
z.number().nonnegative()      // >= 0
z.number().nonpositive()      // <= 0
z.number().int()              // no decimals
z.number().finite()
z.number().safe()             // within Number.MAX_SAFE_INTEGER
z.number().multipleOf(5)
```

---

## Objects

```ts
const StarSchema = z.object({
  name: z.string(),
  mass: z.number(),
  class: z.string(),
})

type Star = z.infer<typeof StarSchema>
```

### Modifying object schemas

```ts
// extend — add fields
const DetailedStarSchema = StarSchema.extend({
  age: z.number(),
  planets: z.number(),
})

// pick — keep only specified fields
const SlimStarSchema = StarSchema.pick({ name: true })

// omit — drop specified fields
const NoMassSchema = StarSchema.omit({ mass: true })

// partial — all fields optional
const PartialStarSchema = StarSchema.partial()

// partial on specific fields only
const SomeOptionalSchema = StarSchema.partial({ mass: true })

// required — strip optional from all fields
const FullyRequiredSchema = StarSchema.required()

// merge — combine two object schemas
const OtherSchema = z.object({ radius: z.number() })
const MergedSchema = StarSchema.merge(OtherSchema)
```

### Strict vs passthrough

By default Zod strips unknown keys silently:

```ts
const result = StarSchema.parse({ name: "Sol", mass: 1, class: "G", unknown: "ignored" })
// unknown key is stripped from result

// throw if unknown keys present
StarSchema.strict().parse({ name: "Sol", mass: 1, class: "G", extra: "oops" }) // throws

// keep unknown keys as-is
StarSchema.passthrough().parse({ name: "Sol", mass: 1, class: "G", extra: "kept" })
// { name, mass, class, extra }
```

---

## Optional, Nullable, Default

```ts
z.string().optional()          // string | undefined
z.string().nullable()          // string | null
z.string().nullish()           // string | null | undefined
z.string().default("unknown")  // uses "unknown" if value is undefined
z.string().catch("fallback")   // uses "fallback" if validation fails (no throw)
```

---

## Arrays

```ts
z.array(z.string())
z.array(z.number()).min(1)
z.array(z.number()).max(10)
z.array(z.number()).length(3)  // exactly 3 elements
z.array(z.string()).nonempty() // at least 1
```

Typed as `string[]`, `number[]`, etc.

---

## Tuples — fixed-length, mixed-type arrays

```ts
const CoordSchema = z.tuple([z.number(), z.number()])
type Coord = z.infer<typeof CoordSchema>
// [number, number]

// with rest elements
const AtLeastTwoSchema = z.tuple([z.string(), z.string()]).rest(z.string())
```

---

## Enums

```ts
// Zod enum — preferred for string literals
const DirectionSchema = z.enum(["north", "south", "east", "west"])
type Direction = z.infer<typeof DirectionSchema>
// "north" | "south" | "east" | "west"

// access values
DirectionSchema.options  // ["north", "south", "east", "west"]
DirectionSchema.enum.north  // "north"

// Native TS enum
enum Status { Active = "active", Inactive = "inactive" }
const StatusSchema = z.nativeEnum(Status)
```

---

## Union & Discriminated Union

```ts
// union — try each schema in order
const IdSchema = z.union([z.string(), z.number()])

// discriminated union — faster, explicit discriminant key
const ShapeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("circle"), radius: z.number() }),
  z.object({ kind: z.literal("rect"), width: z.number(), height: z.number() }),
])

type Shape = z.infer<typeof ShapeSchema>
```

Use discriminated union when you have a type field — it's more performant and gives better errors.

---

## Literals

```ts
z.literal("admin")
z.literal(42)
z.literal(true)

// union of literals
const RoleSchema = z.union([z.literal("admin"), z.literal("user"), z.literal("guest")])

// v4 shorthand
const RoleSchema = z.literal(["admin", "user", "guest"])
```

---

## Records — dynamic keys

```ts
const ScoreboardSchema = z.record(z.string(), z.number())
type Scoreboard = z.infer<typeof ScoreboardSchema>
// { [key: string]: number }
```

---

## Intersection

```ts
const TimestampedSchema = z.object({ createdAt: z.string() })
const NamedSchema = z.object({ name: z.string() })

const TimestampedNamedSchema = z.intersection(TimestampedSchema, NamedSchema)
// equivalent to NamedSchema.merge(TimestampedSchema) for objects
```

---

## Transform — reshape after validation

```ts
// validate then transform
const TrimmedSchema = z.string().transform((val) => val.trim().toLowerCase())

// string date → Date object
const DateSchema = z.string().transform((val) => new Date(val))

// parse number from string
const NumericStringSchema = z.string().transform((val) => parseInt(val, 10))
```

After a transform, `z.infer` gives you the *output* type, not the input type.

```ts
type Out = z.infer<typeof TrimmedSchema>  // string
type Out = z.infer<typeof DateSchema>     // Date
```

If you need both input and output types:
```ts
type Input = z.input<typeof DateSchema>   // string
type Output = z.output<typeof DateSchema> // Date
```

---

## Preprocess — coerce before validation

```ts
// force-cast incoming value before schema runs
const NumberSchema = z.preprocess((val) => Number(val), z.number())

NumberSchema.parse("42")   // 42 (number)
NumberSchema.parse(true)   // 1
```

Or use Zod's built-in coercion:
```ts
z.coerce.number()   // Number(input)
z.coerce.string()   // String(input)
z.coerce.boolean()  // Boolean(input)
z.coerce.date()     // new Date(input)
```

---

## Refine — custom validation logic

```ts
// single condition
const EvenSchema = z.number().refine((n) => n % 2 === 0, {
  message: "Must be even",
})

// async refine (e.g. DB uniqueness check)
const UniqueNameSchema = z.string().refineAsync(async (name) => {
  const exists = await db.exists(name)
  return !exists
}, { message: "Name already taken" })

// superRefine — multiple issues, fine-grained control
const PasswordSchema = z.string().superRefine((val, ctx) => {
  if (val.length < 8) {
    ctx.addIssue({ code: z.ZodIssueCode.too_small, minimum: 8, type: "string", inclusive: true, message: "Too short" })
  }
  if (!/[A-Z]/.test(val)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Need uppercase letter" })
  }
})
```

---

## Parse vs SafeParse

```ts
// parse — throws ZodError on failure
const planet = PlanetSchema.parse(input)

// safeParse — never throws, returns result union
const result = PlanetSchema.safeParse(input)

if (result.success) {
  result.data   // typed as Planet
} else {
  result.error  // ZodError
  result.error.issues  // array of { path, message, code }
}

// async variants
await PlanetSchema.parseAsync(input)
await PlanetSchema.safeParseAsync(input)
```

---

## Error handling

```ts
const result = PlanetSchema.safeParse({ name: 123, moons: "lots" })

if (!result.success) {
  for (const issue of result.error.issues) {
    console.log(issue.path)     // ["name"] — which field
    console.log(issue.message)  // "Expected string, received number"
    console.log(issue.code)     // "invalid_type"
  }

  // flatten for simple key: message mapping
  const flat = result.error.flatten()
  // { fieldErrors: { name: ["Expected string..."] }, formErrors: [] }
}
```

---

## Custom error messages

```ts
z.string({ message: "Must be a string" })
z.string().min(3, { message: "At least 3 chars" })
z.string().email("Not a valid email")
```

---

## Lazy — recursive / self-referential schemas

```ts
type Category = {
  name: string
  subcategories: Category[]
}

const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(CategorySchema),
  })
)
```

---

## Pipe — chain schemas

```ts
// validate as string, then validate the transformed output
const UUIDFromStringSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().uuid())
```

---

## Instanceof

```ts
const ErrorSchema = z.instanceof(Error)
const DateInstanceSchema = z.instanceof(Date)
```

---

## Brand — nominal typing

Prevents assigning a plain `string` where you want a validated `Email`:

```ts
const EmailSchema = z.string().email().brand<"Email">()
type Email = z.infer<typeof EmailSchema>

function send(to: Email) {}

send("raw@string.com")              // TS error
send(EmailSchema.parse("a@b.com"))  // ok
```

---

## Practical patterns

### PATCH body — partial update schema from base

```ts
const BaseSchema = z.object({ title: z.string(), done: z.boolean() })
const CreateSchema = BaseSchema                 // POST — all required
const UpdateSchema = BaseSchema.partial()       // PATCH — all optional
```

### Response schema separate from request schema

```ts
const CreateBodySchema = z.object({ title: z.string() })

const TaskSchema = CreateBodySchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
})

type CreateBody = z.infer<typeof CreateBodySchema>
type Task = z.infer<typeof TaskSchema>
```

### Reusable ID param schema

```ts
const ParamSchema = z.object({ id: z.string().uuid() })
```