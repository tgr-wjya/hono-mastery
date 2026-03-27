/**
 * Hono routes
 */

import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { NotFoundException, TaskNotFound } from "./errors/error";
import { TaskRoutes } from "./routes/tasks";
import { availableEndpointsArray, docsUrl } from "./types";
import { TaskRoutes } from "./routes/tasks";
import { availableEndpointsArray, docsUrl } from "./types";

const app = new Hono();

app.onError((err, c) => {
	const extra: Record<string, unknown> = {};
	let status = 500;

	if (err instanceof NotFoundException) {
		status = err.status;
		extra.availableEndpoints = err.availableEndpoints;
		extra.docs = err.docs;
	} else if (err instanceof TaskNotFound) {
		status = err.status;
	} else if (err instanceof ZodError) {
		status = 400;
	}

	return c.json(
		{
			error:
				err instanceof ZodError
					? err.issues
					: err instanceof Error
						? err.message
						: "Unknown Error",
			timestamp: new Date().toISOString(),
			...extra,
		},
		status as ContentfulStatusCode,
	);
});

app.get("/", (c) => {
	return c.json({
		app: "Task API",
		author: "Tegar Wijaya Kusuma",
		repo: "https://github.com/tgr-wjya/task-api",
	});
});

app.route("/tasks", TaskRoutes());

app.all("/*", () => {
	throw new NotFoundException(availableEndpointsArray, docsUrl);
});

// Keep export here for easier testing.
export default app;
