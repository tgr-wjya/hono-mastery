/**
 * Test runner for Hono
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { describe, expect, it } from "bun:test";
import app from "../src/app";
import {
  availableEndpointsArray,
  docsUrl,
  type WildcardError,
} from "../src/types";

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
  it.each(["/1", "/tasksss", "/taz", "whatever/here"])(
    "Returns 404 with wildcard fields on %s",
    async (url) => {
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
    },
  );
});
