/**
 * Test runner for Hono
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import app from "../src/app";
import { TaskNotFound } from "../src/errors/error";
import { TaskRoutes } from "../src/routes/tasks";
import { TaskService } from "../src/services/task.service";
import {
	availableEndpointsArray,
	docsUrl,
	type Task,
	type WildcardError,
} from "../src/types";

let testApp: Hono;
let service: TaskService;

it("Should return app, author and repo field on /root", async () => {
	const res = await app.request("/");

	const hello = await res.json();
	expect(hello).toEqual({
		app: "Task API",
		author: "Tegar Wijaya Kusuma",
		repo: "https://github.com/tgr-wjya/task-api",
	});
});

describe("ALL wildcards", () => {
	it.each([
		"/1",
		"/tasksss",
		"/taz",
		"whatever/here",
	])("Returns 404 with wildcard fields on %s", async (url) => {
		const res = await app.request(url, {
			method: "GET",
		});

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
	beforeEach(() => {
		service = new TaskService();
		testApp = new Hono();
		testApp.route("/tasks", TaskRoutes(service));
	});

	it("should return empty array when no tasks exist", async () => {
		const res = await testApp.request("/tasks/all");

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toBeArray();
		expect(body).toHaveLength(0);
	});

	it("Should return all tasks with the correct shape (id, title, status, createdAt) field and 200 status code as response", async () => {
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

	it("Should preserve insertion order and return the correct order on array", async () => {
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

	it("Should return a single task with the correct ID with 200 status code", async () => {
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

	it("Getting a task with a malformed/invalid UUID returns the appropriate error", async () => {
		const res = await testApp.request("/tasks/12b12b");

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "Task Not Found");
		expect(body).toHaveProperty("timestamp");
	});
});

describe("DELETE /tasks/:id", () => {
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

	it("Should be able to delete a task with the correct ID and return 200 as response", async () => {
		const toDelete = service.add("Task To Delete", "pending");

		const res = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});

		expect(res.status).toBe(200);
		const deleted = await res.json();
		expect(deleted).toBe(true);
	});

	it("Deleted tasks no longer appears", async () => {
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

	it("Deleting a non-existent task returns 404", async () => {
		const res = await testApp.request("/tasks/12b12b", {
			method: "DELETE",
		});

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "Task Not Found");
		expect(body).toHaveProperty("timestamp");
	});

	it("Deleting the same task twice returns 404 on the second attempt", async () => {
		const toDelete = service.add("Task To Delete", "pending");

		const firstAttempt = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});

		expect(firstAttempt.status).toBe(200);

		const secondAttempt = await testApp.request(`/tasks/${toDelete.id}`, {
			method: "DELETE",
		});

		expect(secondAttempt.status).toBe(404);
		const body = await secondAttempt.json();
		expect(body).toHaveProperty("error", "Task Not Found");
		expect(body).toHaveProperty("timestamp");
	});
});
