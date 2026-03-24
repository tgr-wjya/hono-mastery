/**
 * Test runner for Hono
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { describe, expect, it } from "bun:test";
import app from "../src/app";

const BASE_URL = "http://localhost:3000";

describe("Initial Test", () => {
	it("Should return Hello, Hono in plain text on /root", async () => {
		const response = await app.request(
			new Request(`${BASE_URL}/`, {
				method: "GET",
			}),
		);

		const hello = await response.text();
		expect(hello).toBe("Hello Hono!");
	});
});
