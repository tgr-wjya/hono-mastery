/**
 * Task REST API Service Class
 *
 * @author Tegar Wijaya Kusuma
 * @date 29 March 2026
 */

import { TaskNotFound } from "../errors/error";
import type { Status, Task } from "../types";

export class TaskService {
	private tasks: Task[] = [];

	add(title: string, status?: Status) {
		const newTask = {
			id: crypto.randomUUID(),
			title,
			status,
			createdAt: new Date().toISOString(),
		};

		this.tasks.push(newTask);
		return newTask;
	}

	getAll() {
		return this.tasks;
	}

	getById(id: string) {
		const find = this.tasks.find((task) => task.id === id);
		if (!find) {
			throw new TaskNotFound();
		}

		return find;
	}

	async update(id: string, title?: string, status?: Status) {
		const find = this.tasks.findIndex((task) => task.id === id);

		if (find === -1) {
			throw new TaskNotFound();
		}

		this.tasks[find] = {
			...this.tasks[find],
			...(title !== undefined && {
				title,
			}),
			...(status !== undefined && {
				status,
			}),
		} as Task;

		this.tasks.splice(find, 1, this.tasks[find]);
		return this.tasks[find];
	}

	remove(id: string) {
		const remove = this.tasks.findIndex((task) => task.id === id);
		if (remove === -1) {
			throw new TaskNotFound();
		}
		this.tasks.splice(remove, 1);

		return true;
	}
}
