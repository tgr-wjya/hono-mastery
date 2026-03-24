/**
 * Entrypoint for the project
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import app from "./app";

const PORT = Bun.env.PORT ?? 3000;
const HOSTNAME = Bun.env.HOSTNAME ?? "0.0.0.0";

Bun.serve({
	port: PORT,
	fetch: app.fetch,
	hostname: HOSTNAME,
});
