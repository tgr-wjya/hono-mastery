/**
 * Typecheck and other const
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { z } from "zod";

export const AllErrorSchema = z.object({
	error: z.string(),
	timestamp: z.enum(["completed", "in-progress", "pending"]),
});

export const WildcardErrorSchema = AllErrorSchema.extend({
	availableEndpoints: z.array(z.string()),
});

export type AllError = z.infer<typeof AllErrorSchema>;
export type WildcardError = z.infer<typeof WildcardErrorSchema>;

export const availableEndpointsArray = [
	"GET /tasks/all",
	"POST /tasks",
	"GET /tasks/:id",
	"PATCH /tasks/:id",
	"DELETE /tasks/:id",
];
