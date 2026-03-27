/**
 * Custom class error
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

export class NotFoundException extends Error {
	status = 404;
	availableEndpoints: string[];
	docs: string;

	constructor(availableEndpoints: string[], docs: string) {
		super(
			"Not Found. Please Refer To The Documentation Below For More Information",
		);
		this.availableEndpoints = availableEndpoints;
		this.docs = docs;
	}
}

export class TaskNotFound extends Error {
	status = 404;

	constructor() {
		super("Task Not Found");
	}
}
