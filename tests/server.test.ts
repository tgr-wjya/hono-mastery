/**
 * Test runner for Hono
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { describe, expect, it } from "bun:test";
import app from "../src/app";

describe("Initial Test", () => {
	it("Should return Hello, Hono in plain text on /root", async () => {
		const res = await app.request("/");

		const hello = await res.text();
		expect(hello).toBe("Hello Hono!");
	});
});
