/**
 * Task API Routes
 *
 * @author Tegar Wijaya Kusuma
 * @date 28 March 2026
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { TaskService } from "../services/task.service";
import { CreateTaskSchema, TaskIdSchema, UpdateTaskSchema } from "../types";

export function TaskRoutes(service = new TaskService()) {
	const taskRouter = new Hono();

	taskRouter.get("/all", (c) => {
		return c.json(service.getAll(), 200);
	});

	taskRouter.get("/:id", zValidator("param", TaskIdSchema), (c) => {
		const { id } = c.req.valid("param");
		TaskIdSchema.safeParse(id);

		return c.json(service.getById(id), 200);
	});

	taskRouter.post("/", zValidator("json", CreateTaskSchema), async (c) => {
		const body = c.req.valid("json");
		CreateTaskSchema.safeParse(body);

		return c.json(service.add(body.title, body.status), 201);
	});

	taskRouter.patch(
		"/:id",
		zValidator("param", TaskIdSchema),
		zValidator("json", UpdateTaskSchema),
		async (c) => {
			const { id } = c.req.valid("param");
			TaskIdSchema.safeParse(id);

			const { title, status } = c.req.valid("json");
			UpdateTaskSchema.safeParse({ title, status });

			return c.json(await service.update(id, title, status), 200);
		},
	);

	taskRouter.delete("/:id", zValidator("param", TaskIdSchema), (c) => {
		const { id } = c.req.valid("param");
		TaskIdSchema.safeParse(id);
		service.remove(id);

		return c.json(true, 200);
	});

	return taskRouter;
}
