/**
 * Typecheck and other const
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

import { z } from "zod";

export const AllErrorSchema = z.object({
	error: z.string(),
	timestamp: z.string(),
});

export const WildcardErrorSchema = AllErrorSchema.extend({
	availableEndpoints: z.array(z.string()),
	docs: z.string(),
});

export const FullTaskSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(4),
	status: z.enum(["completed", "pending", "in-progress"]).optional(),
	createdAt: z.string().min(1),
});

export const CreateTaskSchema = z.object({
	title: z.string().min(4),
	status: z.enum(["completed", "pending", "in-progress"]).optional(),
});

export const TaskIdSchema = z.object({
	id: z.string().min(1),
});

export const ZodErrorSchema = z.object({
	success: z.boolean(),
	error: z.object({
		name: z.string(),
		message: z.string(),
	}),
});

export type ZodError = z.Infer<typeof ZodErrorSchema>;
export type Status = z.Infer<typeof FullTaskSchema>["status"];
export type Task = z.Infer<typeof FullTaskSchema>;
export type AllError = z.Infer<typeof AllErrorSchema>;
export type WildcardError = z.Infer<typeof WildcardErrorSchema>;

export const availableEndpointsArray = [
	"GET /tasks/all",
	"POST /tasks",
	"GET /tasks/:id",
	"PATCH /tasks/:id",
	"DELETE /tasks/:id",
];

export const docsUrl =
	String(Bun.env.DOCS_URL) || "https://github.com/tgr-wjya/task-api";
