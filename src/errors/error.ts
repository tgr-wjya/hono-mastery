/**
 * Custom class error
 *
 * @author Tegar Wijaya Kusuma
 * @date 25 March 2026
 */

export class NotFoundException extends Error {
	status = 404;
	availableEndpoints: string[];

	constructor(availableEndpoints: string[]) {
		super("Not Found");
		this.availableEndpoints = availableEndpoints;
	}
}
