/**
 * Test runner for Hono
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import app from "../src/app";
import { NotFoundException, TaskNotFound } from "../src/errors/error";
import { TaskRoutes } from "../src/routes/tasks";
import { TaskService } from "../src/services/task.service";
import {
	type AllError,
	availableEndpointsArray,
	docsUrl,
	type Task,
	type WildcardError,
} from "../src/types";

let testApp: Hono;
let service: TaskService;

function setupTestApp() {
	service = new TaskService();
	testApp = new Hono();
	testApp.route("/tasks", TaskRoutes(service));
	testApp.onError((err, c) => {
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
}

it("GET / — returns app metadata", async () => {
	const res = await app.request("/");
	const hello = await res.json();
	expect(hello).toEqual({
		app: "Task API",
		author: "Tegar Wijaya Kusuma",
		repo: "https://github.com/tgr-wjya/task-api",
	});
});

describe("Wildcard routes", () => {
	it.each([
		"/1",
		"/tasksss",
		"/taz",
		"whatever/here",
	])("GET %s — returns 404 with wildcard error shape", async (url) => {
		const res = await app.request(url, { method: "GET" });

		expect(res.status).toBe(404);
		const body = (await res.json()) as WildcardError;
		expect(body).toHaveProperty(
			"error",
			"Not Found. Please Refer To The Documentation Below For More Information",
		);
		expect(body).toHaveProperty("timestamp");
		expect(body).toHaveProperty("docs");
		expect(body.availableEndpoints).toEqual(availableEndpointsArray);
		expect(body.docs).toBe(docsUrl);
		expect(body.availableEndpoints).toBeArray();
	});
});

describe("GET /tasks/all", () => {
	beforeEach(setupTestApp);

	it("returns an empty array when no tasks exist", async () => {
		const res = await testApp.request("/tasks/all");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toBeArray();
		expect(body).toHaveLength(0);
	});

	it("returns all tasks with correct shape (id, title, status, createdAt)", async () => {
		service.add("Test 1", "completed");
		service.add("Test 2", "completed");

		const res = await testApp.request("/tasks/all");

		expect(res.status).toBe(200);
		const added = (await res.json()) as Task[];
		expect(added[0]).toHaveProperty("id");
		expect(added[0]).toHaveProperty("title", "Test 1");
		expect(added[0]).toHaveProperty("status", "completed");
		expect(added[0]).toHaveProperty("createdAt");

		expect(added[1]).toHaveProperty("id");
		expect(added[1]).toHaveProperty("title", "Test 2");
		expect(added[1]).toHaveProperty("status", "completed");
		expect(added[1]).toHaveProperty("createdAt");
	});

	it("preserves insertion order", async () => {
		service.add("First", "completed");
		service.add("Second", "completed");
		service.add("Third", "completed");

		const res = await testApp.request("/tasks/all");

		expect(res.status).toBe(200);
		const order = (await res.json()) as Task[];
		expect(order[0]).toHaveProperty("title", "First");
		expect(order[1]).toHaveProperty("title", "Second");
		expect(order[2]).toHaveProperty("title", "Third");
	});
});

describe("GET /tasks/:id", () => {
	beforeEach(setupTestApp);

	it("returns a single task by ID with correct shape", async () => {
		const added = service.add("Test Task", "completed");

		const res = await testApp.request(`/tasks/${added.id}`);

		expect(res.status).toBe(200);
		const created = (await res.json()) as Task;
		expect(created).toHaveProperty("id", added.id);
		expect(created).toHaveProperty("title", "Test Task");
		expect(created).toHaveProperty("status", "completed");
		expect(created).toHaveProperty("createdAt");
		expect(created).toBeObject();
	});

	it("returns 404 for a malformed/invalid UUID", async () => {
		const res = await testApp.request("/tasks/12b12b");

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "Task Not Found");
		expect(body).toHaveProperty("timestamp");
	});
});

describe("POST /tasks", () => {
	beforeEach(setupTestApp);

	it("creates a task with valid body and returns 201", async () => {
		const res = await testApp.request("/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: "Take out the trash",
				status: "completed",
			}),
		});

		expect(res.status).toBe(201);
		const created = await res.json();
		expect(created).toHaveProperty("id");
		expect(created).toHaveProperty("title", "Take out the trash");
		expect(created).toHaveProperty("status", "completed");
		expect(created).toHaveProperty("createdAt");
	});

	it("returns 500 when no body is provided", async () => {
		const res = await testApp.request("/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		});

		expect(res.status).toBe(500);
		const rejected = (await res.json()) as AllError;
		expect(rejected.error).toBe("Malformed JSON in request body");
		expect(rejected).toHaveProperty("timestamp");
	});

	it("returns 400 from Zod when body is an empty object", async () => {
		const res = await testApp.request("/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(400);
		const rejected = (await res.json()) as { success: boolean; error: unknown };
		expect(rejected.success).toBe(false);
		expect(rejected.error).toBeObject();
		expect(rejected.error).toHaveProperty("name", "ZodError");
		expect(rejected.error).toHaveProperty("message");
	});
});

describe("DELETE /tasks/:id", () => {
	beforeEach(setupTestApp);

	it("deletes a task by ID and returns true", async () => {
		const toDelete = service.add("Task To Delete", "pending");

		const res = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});

		expect(res.status).toBe(200);
		expect(await res.json()).toBe(true);
	});

	it("deleted task no longer appears in GET /tasks/all", async () => {
		const toDelete = service.add("Task To Delete", "pending");
		const shouldRemain = service.add("Task To Delete 2", "pending");

		const deleted = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});
		expect(deleted.status).toBe(200);

		const get = await testApp.request("/tasks/all");
		expect(get.status).toBe(200);
		const all = (await get.json()) as Task[];
		expect(all[0]).toHaveProperty("id", shouldRemain.id);
		expect(all[0]).toHaveProperty("title", "Task To Delete 2");
		expect(all[0]).toHaveProperty("status", "pending");
		expect(all[0]).toHaveProperty("createdAt");
	});

	it("returns 404 when deleting a non-existent task", async () => {
		const res = await testApp.request("/tasks/12b12b", { method: "DELETE" });

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "Task Not Found");
		expect(body).toHaveProperty("timestamp");
	});

	it("returns 404 on the second delete attempt for the same task", async () => {
		const toDelete = service.add("Task To Delete", "pending");

		const first = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});
		expect(first.status).toBe(200);

		const second = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});
		expect(second.status).toBe(404);
		const body = await second.json();
		expect(body).toHaveProperty("error", "Task Not Found");
		expect(body).toHaveProperty("timestamp");
	});
});
