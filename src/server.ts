/**
 * Entrypoint for the project
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import app from "./app";

const PORT = Number(Bun.env.PORT ?? 3000);

Bun.serve({
	port: PORT,
	fetch: app.fetch,
});
