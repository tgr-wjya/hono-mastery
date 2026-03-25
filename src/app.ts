/**
 * Hono routes
 */

import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { NotFoundException } from "./errors/error";
import { availableEndpointsArray } from "./types";

const app = new Hono();

app.onError((err, c) => {
	const extra: Record<string, unknown> = {};
	let status = 500;

	if (err instanceof NotFoundException) {
		status = err.status;
		extra.availableEndpoints = err.availableEndpoints;
	}

	return c.json(
		{
			error: err instanceof Error ? err.message : "Unknown Error",
			timestamp: new Date().toISOString(),
			...extra,
		},
		status as ContentfulStatusCode,
	);
});

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.all("/*", () => {
	throw new NotFoundException(availableEndpointsArray);
});

// Keep export here for easier testing.
export default app;
