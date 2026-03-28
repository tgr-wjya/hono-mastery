/**
 * Serve the Hono instance with Bun
 *
 * @author Tegar Wijaya Kusuma
 * @date 29 March 2026
 */

import app from "./app";

Bun.serve({
	port: Number(Bun.env.PORT ?? 3000),
	hostname: "0.0.0.0",
	fetch: app.fetch,
});
