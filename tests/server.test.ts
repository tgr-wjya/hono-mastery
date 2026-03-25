/**
 * Test runner for Hono
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { describe, expect, it } from "bun:test";
import app from "../src/app";
import { availableEndpointsArray, type WildcardError } from "../src/types";

describe("Initial Test", () => {
	it("Should return Hello, Hono in plain text on /root", async () => {
		const res = await app.request("/");

		const hello = await res.text();
		expect(hello).toBe("Hello Hono!");
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
		expect(body).toHaveProperty("error", "Not Found");
		expect(body).toHaveProperty("timestamp");
		expect(body.availableEndpoints).toEqual(availableEndpointsArray);
		expect(body.availableEndpoints).toBeArray();
	});
});
